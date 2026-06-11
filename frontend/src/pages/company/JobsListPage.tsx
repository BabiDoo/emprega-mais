import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, ChevronRight } from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getCompanyJobPosts } from '@/services/api';
import { storage } from '@/utils/storage';
import { CANDIDATE_TYPE_LABELS } from '@/utils/cn';
import type { JobPost } from '@/types';

export const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = storage.getCompanyId();
    if (!companyId) { navigate('/company/auth'); return; }
    getCompanyJobPosts(companyId)
      .then((r) => setJobs(r.data))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <CompanyLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Vagas</h1>
            <p className="text-gray-500 text-sm mt-1">{jobs.length} vaga{jobs.length !== 1 ? 's' : ''} publicada{jobs.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => navigate('/company/jobs/new')}>
            <Plus size={16} />
            Nova vaga
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center">
              <Briefcase size={32} className="text-primary/40" />
            </div>
            <div>
              <p className="font-semibold text-primary text-lg">Nenhuma vaga ainda</p>
              <p className="text-gray-400 text-sm mt-1">Publique sua primeira vaga e encontre talentos incríveis.</p>
            </div>
            <Button onClick={() => navigate('/company/jobs/new')}>
              <Plus size={16} />
              Criar vaga
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card
                key={job.id}
                hover
                onClick={() => navigate(`/company/jobs/${job.id}`)}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary truncate">{job.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{job.area}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.candidateTypes?.map((t) => (
                      <Badge key={t} variant="accent">
                        {CANDIDATE_TYPE_LABELS[t] || t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {job.hashtags?.slice(0, 2).map((h) => (
                      <span key={h} className="text-xs bg-surface text-gray-500 px-2 py-0.5 rounded-full">{h}</span>
                    ))}
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CompanyLayout>
  );
};
