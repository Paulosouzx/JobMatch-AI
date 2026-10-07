import type { FieldReview, ResumeFields, ResumeStructure, StyleGuide } from '@jobmatch/core';
import { DEFAULT_STYLE_GUIDE } from '@jobmatch/core';
import { supabase } from './supabase';

export interface ResumeTemplateRow {
  structure: ResumeStructure;
  fields: ResumeFields;
  adaptable: string[];
}

export interface ResumeVersionRow {
  id: string;
  job_id: string;
  base_fields: ResumeFields;
  review: FieldReview[];
  final_fields: ResumeFields | null;
  model: string | null;
  status: 'draft' | 'final';
  created_at: string;
}

export async function loadTemplate(): Promise<ResumeTemplateRow | null> {
  const { data, error } = await supabase
    .from('jm_resume_templates')
    .select('structure, fields, adaptable')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ResumeTemplateRow | null) ?? null;
}

export async function loadStyleGuide(): Promise<StyleGuide> {
  const { data, error } = await supabase
    .from('jm_style_guides')
    .select('rules, banned_phrases, samples')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_STYLE_GUIDE;
  return {
    rules: data.rules?.length ? data.rules : DEFAULT_STYLE_GUIDE.rules,
    bannedPhrases: data.banned_phrases ?? DEFAULT_STYLE_GUIDE.bannedPhrases,
    samples: data.samples ?? [],
  };
}

export function fieldLabel(key: string, structure: ResumeStructure): string {
  for (const section of structure.sections) {
    if (section.type === 'skills') {
      const group = section.groups.find((item) => item.field === key);
      if (group) return `${section.title} · ${group.label}`;
    }
    if (section.type === 'experience') {
      for (const item of section.items) {
        if (item.stackField === key) return `${item.heading} · Stack`;
        const index = item.bullets.indexOf(key);
        if (index >= 0) return `${item.heading} · Bullet ${index + 1}`;
      }
    }
    if (section.type === 'summary' && section.field === key) return section.title;
  }
  return key;
}
