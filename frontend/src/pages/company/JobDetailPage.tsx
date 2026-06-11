import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  User,
  Star,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { getJobPost, getMatches, runMatch } from '@/services/api';
import { CANDIDATE_TYPE_LABELS } from '@/utils/cn';
import type { JobPost, Match } from '@/types';

export const JobDetailPage: React.FC = () => {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobPost | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);

  const [feedbackMatch, setFeedbackMatch] = useState<Match | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [interviewDate, setInterviewDate] = useState('');

  const loadData = () => {
    if (!jobPostId) return;
    Promise.all([getJobPost(jobPostId), getMatches(jobPostId)])
      .then(([j, m]) => {
        setJob(j.data);
        setMatches(m.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [jobPostId]);

  const handleRunMatch = async () => {
    if (!jobPostId) return;
    setMatchLoading(true);
    try {
      await runMatch(jobPostId);
      const { data } = await getMatches(jobPostId);
      setMatches(data);
    } finally {
      setMatchLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/company/jobs')}
            className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-primary transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary">{job?.title}</h1>
            <p className="text-gray-500 text-sm">{job?.area}</p>
          </div>
          <Button onClick={handleRunMatch} loading={matchLoading} variant="secondary" size="sm">
            <Play size={14} />
            Rodar match IA
          </Button>
        </div>

        {/* Job details */}
        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Descrição</p>
              <p className="text-sm text-gray-700 leading-relaxed">{job?.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {job?.candidateTypes?.map((t) => (
                <Badge key={t} variant="accent">{CANDIDATE_TYPE_LABELS[t] || t}</Badge>
              ))}
              {job?.hashtags?.map((h) => (
                <Badge key={h} variant="gray">{h}</Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Matches */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Candidatos compatíveis
            {matches.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({matches.length})
              </span>
            )}
          </h2>

          {matchLoading ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader size={32} className="text-primary animate-spin" />
              <p className="text-gray-500 text-sm">Analisando candidatos com IA...</p>
            </Card>
          ) : matches.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <User size={32} className="text-gray-300" />
              <p className="font-medium text-primary">Nenhum match ainda</p>
              <p className="text-gray-400 text-sm">
                Clique em "Rodar match IA" para encontrar candidatos compatíveis.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <Card key={match.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary text-sm">
                          {match.talentProfile?.name || 'Candidato'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {match.talentProfile?.phone}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${scoreBg(match.score)}`}>
                      <Star size={14} className={scoreColor(match.score)} />
                      <span className={`font-bold text-sm ${scoreColor(match.score)}`}>
                        {match.score}%
                      </span>
                    </div>
                  </div>

                  {match.justification && (
                    <p className="text-xs text-gray-500 bg-surface rounded-lg px-3 py-2 leading-relaxed">
                      {match.justification}
                    </p>
                  )}

                  {match.status === 'interview_scheduled' && match.interviewDate && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      <Calendar size={14} />
                      Entrevista: {new Date(match.interviewDate).toLocaleString('pt-BR')}
                    </div>
                  )}

                  {match.feedback && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-surface rounded-lg px-3 py-2">
                      <MessageSquare size={14} />
                      {match.feedback}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFeedbackMatch(match);
                        setFeedbackText(match.feedback || '');
                        setInterviewDate(match.interviewDate || '');
                      }}
                    >
                      <MessageSquare size={14} />
                      Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/company/candidates/${match.talentProfileId}`)}
                    >
                      Ver currículo
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feedback modal */}
      <Modal
        open={!!feedbackMatch}
        onClose={() => setFeedbackMatch(null)}
        title="Dar feedback ao candidato"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Data da entrevista (opcional)"
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            icon={<Calendar size={15} />}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-primary-700">Mensagem / feedback</label>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ex: Parabéns! Você foi selecionado para uma entrevista..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setFeedbackMatch(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                // In a full implementation, this would call a PATCH/feedback endpoint
                setFeedbackMatch(null);
              }}
            >
              <CheckCircle size={14} />
              Enviar feedback
            </Button>
          </div>
        </div>
      </Modal>
    </CompanyLayout>
  );
};
