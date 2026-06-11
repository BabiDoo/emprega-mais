import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserRound, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { storage } from '@/utils/storage';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectRole = (role: 'company' | 'candidate') => {
    storage.setRole(role);
    if (role === 'company') {
      const companyId = storage.getCompanyId();
      if (companyId) {
        navigate('/company/dashboard');
      } else {
        navigate('/company/auth');
      }
    } else {
      navigate('/candidate/chat');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary to-primary-600 flex flex-col items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/10" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-white/3" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo size={64} showText={false} />
          <div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight">
              emprega<span className="text-accent">+</span>
            </h1>
            <p className="mt-3 text-white/70 text-lg leading-relaxed">
              Conectando talentos sênior e PcD com
              <br />
              empresas que valorizam a diversidade.
            </p>
          </div>
        </div>

        {/* Role selection */}
        <div className="w-full space-y-4">
          <p className="text-white/60 text-sm font-medium text-center uppercase tracking-widest">
            Como você quer entrar?
          </p>

          <button
            onClick={() => handleSelectRole('candidate')}
            className="group w-full flex items-center gap-5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl p-5 transition-all duration-200 text-left"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
              <UserRound size={28} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-base">Sou candidato</p>
              <p className="text-white/60 text-sm mt-0.5">
                Idoso 60+ ou Pessoa com Deficiência
              </p>
            </div>
            <ArrowRight
              size={20}
              className="text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all"
            />
          </button>

          <button
            onClick={() => handleSelectRole('company')}
            className="group w-full flex items-center gap-5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl p-5 transition-all duration-200 text-left"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary-200/20 flex items-center justify-center">
              <Building2 size={28} className="text-primary-100" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-base">Sou empresa</p>
              <p className="text-white/60 text-sm mt-0.5">
                Cadastrar vagas e encontrar talentos
              </p>
            </div>
            <ArrowRight
              size={20}
              className="text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all"
            />
          </button>
        </div>

        <p className="text-white/30 text-xs text-center">
          Inclusão que transforma. Diversidade que fortalece.
        </p>
      </div>
    </div>
  );
};
