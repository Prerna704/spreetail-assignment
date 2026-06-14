INSERT INTO exchange_rates (source_currency, target_currency, rate, effective_date)
VALUES
  ('USD', 'INR', 83.00000000, '2024-01-01'),
  ('INR', 'USD', 0.01204819, '2024-01-01'),
  ('USD', 'INR', 83.12000000, '2026-02-01'),
  ('INR', 'USD', 0.01203000, '2026-02-01')
ON CONFLICT (source_currency, target_currency, effective_date)
DO UPDATE SET rate = EXCLUDED.rate;

INSERT INTO users (id, name, email, password_hash)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Aisha', 'aisha@example.com', '$2a$12$hA248Kz/ffDCiay8YghNI./WbbaDLoZCDqWLF6b5GYlI9zbT2dduG'),
  ('22222222-2222-2222-2222-222222222222', 'Rohan', 'rohan@example.com', '$2a$12$hA248Kz/ffDCiay8YghNI./WbbaDLoZCDqWLF6b5GYlI9zbT2dduG'),
  ('33333333-3333-3333-3333-333333333333', 'Priya', 'priya@example.com', '$2a$12$hA248Kz/ffDCiay8YghNI./WbbaDLoZCDqWLF6b5GYlI9zbT2dduG'),
  ('44444444-4444-4444-4444-444444444444', 'Meera', 'meera@example.com', '$2a$12$hA248Kz/ffDCiay8YghNI./WbbaDLoZCDqWLF6b5GYlI9zbT2dduG'),
  ('55555555-5555-5555-5555-555555555555', 'Sam', 'sam@example.com', '$2a$12$hA248Kz/ffDCiay8YghNI./WbbaDLoZCDqWLF6b5GYlI9zbT2dduG'),
  ('66666666-6666-6666-6666-666666666666', 'Dev', 'dev@example.com', '$2a$12$hA248Kz/ffDCiay8YghNI./WbbaDLoZCDqWLF6b5GYlI9zbT2dduG')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

INSERT INTO groups (id, name, base_currency, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Flatmates Feb-Apr', 'INR', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    base_currency = EXCLUDED.base_currency,
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO group_members (group_id, user_id, join_date, leave_date, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2026-02-01', NULL, 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '2026-02-01', NULL, 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2026-02-01', NULL, 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', '2026-02-01', '2026-03-31', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', '2026-04-15', NULL, 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', '2026-04-10', '2026-04-20', 'member')
ON CONFLICT (group_id, user_id) DO UPDATE
SET join_date = EXCLUDED.join_date,
    leave_date = EXCLUDED.leave_date,
    role = EXCLUDED.role,
    updated_at = NOW();
