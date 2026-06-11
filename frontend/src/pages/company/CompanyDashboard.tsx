import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, TrendingUp, Plus } from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getCompany, getCompanyJobPosts } from '@/services/api';
import { storage } from '@/utils/storage';
import type { Company, JobPost } from '@/types';

export const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = storage.getCompanyId();
    if (!companyId) { navigate('/company/auth'); return; }

    Promise.all([getCompany(companyId), getCompanyJobPosts(companyId)])
      .then(([c, j]) => {
        setCompany(c.data);
        setJobs(j.data);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </CompanyLayout>
    );
  }

  const stats = [
    { label: 'Vagas ativas', value: jobs.length, icon: <Briefcase size={22} className="text-primary" />, color: 'bg-primary/8' },
    { label: 'Candidatos banco', value: '—', icon: <Users size={22} className="text-accent" />, color: 'bg-accent/10' },
    { label: 'Matches realizados', value: '—', icon: <TrendingUp size={22} className="text-primary-400" />, color: 'bg-primary/5' },
  ];

  return (
    <CompanyLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Olá, {company?.name}!
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Gerencie suas vagas e acompanhe os candidatos.
            </p>
          </div>
          <Button onClick={() => navigate('/company/jobs/new')} size="md">
            <Plus size={16} />
            Nova vaga
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Vagas recentes</h2>
            <button
              onClick={() => navigate('/company/jobs')}
              className="text-sm text-accent font-medium hover:underline"
            >
              Ver todas
            </button>
          </div>

          {jobs.length === 0 ? (
            <Card className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center">
                <Briefcase size={28} className="text-primary/50" />
              </div>
              <div>
                <p className="font-semibold text-primary">Nenhuma vaga criada ainda</p>
                <p className="text-gray-400 text-sm mt-1">
                  Crie sua primeira vaga para encontrar talentos inclusivos.
                </p>
              </div>
              <Button onClick={() => navigate('/company/jobs/new')}>
                <Plus size={16} />
                Criar primeira vaga
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <Card
                  key={job.id}
                  hover
                  onClick={() => navigate(`/company/jobs/${job.id}`)}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-primary">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.area}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {job.hashtags?.slice(0, 2).map((h) => (
                      <span key={h} className="text-xs bg-surface text-gray-500 px-2 py-0.5 rounded-full">
                        {h}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </CompanyLayout>
  );
};
