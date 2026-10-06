update public.jm_app_config
set vapid_public_key = '<public key from `npx web-push generate-vapid-keys`>',
    vapid_subject = 'mailto:you@example.com'
where id;

select vault.create_secret('<private key>', 'jm:vapid_private_key');
