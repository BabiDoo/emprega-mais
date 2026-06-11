# Configuração do Supabase Storage

Para o correto funcionamento do MVP, você precisa criar dois buckets **Públicos** no painel do Supabase.

1. Acesse o seu projeto no Supabase > **Storage**.
2. Clique em **New bucket**.
3. Crie os seguintes buckets:

### `candidate-audios`
Este bucket será usado para salvar os arquivos `.webm` gravados no WhatsApp simulator.

### `candidate-resumes`
Este bucket será usado para armazenar os PDFs dos currículos e resumos gerados pela plataforma.

*Lembre-se de configurar as Policies (RLS) para esses buckets, caso necessário, ou deixá-los como públicos se for adequado para a etapa de Hackathon.*
