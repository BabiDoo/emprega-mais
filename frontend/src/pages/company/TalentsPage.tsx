import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, FileText, Search } from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getTalentProfiles } from '@/services/api';
import type { TalentProfile } from '@/types';

export const TalentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getTalentProfiles()
      .then((r) => setTalents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = talents.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <CompanyLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Banco de Talentos</h1>
            <p className="text-gray-500 text-sm mt-1">
              {talents.length} candidato{talents.length !== 1 ? 's' : ''} cadastrado{talents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar candidatos..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <User size={36} className="text-gray-200" />
            <p className="font-medium text-primary">Nenhum candidato encontrado</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((talent) => (
              <Card
                key={talent.id}
                hover
                onClick={() => navigate(`/company/candidates/${talent.id}`)}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={22} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-primary truncate">{talent.name}</p>
                    <p className="text-xs text-gray-400 truncate">{talent.phone}</p>
                  </div>
                </div>

                {talent.summary && (
                  <p className="text-xs text-gray-500 line-clamp-2">{talent.summary}</p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {talent.skills?.slice(0, 3).map((s) => (
                      <Badge key={s} variant="gray">{s}</Badge>
                    ))}
                    {(talent.skills?.length ?? 0) > 3 && (
                      <span className="text-xs text-gray-400 self-center">
                        +{(talent.skills?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/company/candidates/${talent.id}`);
                    }}
                    className="flex items-center gap-1.5 flex-shrink-0 text-xs font-medium
      text-primary border border-primary/30 rounded-lg px-2.5 py-1.5
      hover:bg-primary/5 transition-colors"
                  >
                    <FileText size={12} />
                    Ver currículo
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CompanyLayout>
  );
};
