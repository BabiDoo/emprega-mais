import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Plus, X } from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createJobPost } from '@/services/api';
import { storage } from '@/utils/storage';
import type { CandidateType } from '@/types';
import { CANDIDATE_TYPE_LABELS } from '@/utils/cn';

const CANDIDATE_OPTIONS: CandidateType[] = [
  '60+',
  'PCD_FISICA',
  'PCD_VISUAL',
  'PCD_AUDITIVA',
  'PCD_INTELECTUAL',
  'PCD_AUTISMO',
];

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [candidateTypes, setCandidateTypes] = useState<CandidateType[]>([]);

  const addHashtag = () => {
    const tag = hashInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(`#${tag}`)) {
      setHashtags([...hashtags, `#${tag}`]);
      setHashInput('');
    }
  };

  const removeHashtag = (tag: string) => setHashtags(hashtags.filter((h) => h !== tag));

  const toggleCandidateType = (t: CandidateType) => {
    setCandidateTypes((prev) =>
      prev.includes(t) ? prev.filter((c) => c !== t) : [...prev, t],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = storage.getCompanyId();
    if (!companyId) { navigate('/company/auth'); return; }
    if (candidateTypes.length === 0) {
      setError('Selecione pelo menos um tipo de candidato.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await createJobPost({
        companyId,
        title: title.trim(),
        description: description.trim(),
        area: area.trim(),
        hashtags,
        candidateTypes,
      });
      navigate(`/company/jobs/${data.id}`);
    } catch {
      setError('Erro ao criar vaga. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CompanyLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/company/jobs')}
            className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-primary transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary">Nova vaga</h1>
            <p className="text-gray-400 text-sm">Preencha os detalhes para publicar</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Título da vaga"
              placeholder="Ex: Atendente de Loja"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-primary-700">Descrição</label>
              <textarea
                rows={4}
                placeholder="Descreva as responsabilidades e requisitos da vaga..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-primary-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              />
            </div>

            <Input
              label="Área"
              placeholder="Ex: Atendimento, Logística, TI..."
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            />

            {/* Hashtags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-primary-700">Hashtags</label>
              <div className="flex flex-wrap gap-2">
                <input
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
                  placeholder="#atendimento"
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addHashtag}
                  className="w-full sm:w-auto"
                >
                  <Hash size={15} />
                  Adicionar
                </Button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {hashtags.map((h) => (
                    <span
                      key={h}
                      className="flex items-center gap-1 bg-primary/8 text-primary text-xs px-2.5 py-1 rounded-full"
                    >
                      {h}
                      <button type="button" onClick={() => removeHashtag(h)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Candidate types */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-primary-700">
                Perfil de candidato aceito
                <span className="text-red-400 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-400">Selecione todos os perfis que se aplicam a esta vaga</p>
              <div className="space-y-2">
                {CANDIDATE_OPTIONS.map((opt) => {
                  const selected = candidateTypes.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggleCandidateType(opt)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${selected
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-primary/40 hover:bg-surface'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}
                      >
                        {selected && (
                          <svg viewBox="0 0 12 10" fill="none" className="w-3 h-3">
                            <path d="M1 5l3 4L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {CANDIDATE_TYPE_LABELS[opt]}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              <Plus size={16} />
              Publicar vaga
            </Button>
          </form>
        </Card>
      </div>
    </CompanyLayout>
  );
};
