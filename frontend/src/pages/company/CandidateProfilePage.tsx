import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, FileText, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getTalentProfile } from '@/services/api';
import { CANDIDATE_TYPE_LABELS } from '@/utils/cn';
import type { TalentProfile } from '@/types';

export const CandidateProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getTalentProfile(id)
      .then((r) => setProfile(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CompanyLayout>
    );
  }

  if (!profile) return (
    <CompanyLayout>
      <p className="text-gray-400 text-center mt-20">Candidato não encontrado.</p>
    </CompanyLayout>
  );

  return (
    <CompanyLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-primary transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-primary">Currículo do Candidato</h1>
        </div>

        {/* Hero card */}
        <Card className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User size={32} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-primary">{profile.name}</h2>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} />
                  {profile.phone}
                </span>
              )}
              {profile.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} />
                  {profile.email}
                </span>
              )}
            </div>
            {profile.candidateType && (
              <div className="mt-2">
                <Badge variant="accent">
                  {CANDIDATE_TYPE_LABELS[profile.candidateType] || profile.candidateType}
                </Badge>
              </div>
            )}
          </div>
          {profile.pdfUrl && (
            <a
              href={profile.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                <FileText size={14} />
                Baixar PDF
              </Button>
            </a>
          )}
        </Card>

        {/* Summary */}
        {profile.summary && (
          <Card>
            <h3 className="font-semibold text-primary mb-2">Resumo</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{profile.summary}</p>
          </Card>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <Card>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Wrench size={16} />
              Habilidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <Badge key={s} variant="primary">{s}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Experience */}
        {profile.experience && profile.experience.length > 0 && (
          <Card>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Briefcase size={16} />
              Experiência
            </h3>
            <ul className="space-y-2">
              {profile.experience.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <Card>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <GraduationCap size={16} />
              Formação
            </h3>
            <ul className="space-y-2">
              {profile.education.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </CompanyLayout>
  );
};
