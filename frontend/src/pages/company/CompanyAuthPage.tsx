import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { createCompany, getCompany } from '@/services/api';
import { storage } from '@/utils/storage';

export const CompanyAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login
  const [loginId, setLoginId] = useState('');

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await getCompany(loginId.trim());
      storage.setCompanyId(data.id);
      navigate('/company/dashboard');
    } catch {
      setError('Empresa não encontrada. Verifique o ID e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await createCompany({ name: regName.trim(), email: regEmail.trim() });
      storage.setCompanyId(data.id);
      navigate('/company/dashboard');
    } catch {
      setError('Erro ao cadastrar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Logo size={48} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">Área da Empresa</h1>
            <p className="text-gray-500 text-sm mt-1">
              Acesse sua conta ou cadastre sua empresa
            </p>
          </div>
        </div>

        <Card>
          {/* Tabs */}
          <div className="flex bg-surface rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-primary'
                }`}
              >
                {t === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="ID da Empresa"
                placeholder="Cole o ID recebido no cadastro"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                icon={<Building2 size={16} />}
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Acessar painel
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Nome da empresa"
                placeholder="Ex: Mercado Bom Preço"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                icon={<Building2 size={16} />}
                required
              />
              <Input
                label="E-mail"
                type="email"
                placeholder="rh@suaempresa.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                icon={<Mail size={16} />}
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Criar conta
              </Button>
            </form>
          )}
        </Card>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mx-auto"
        >
          <ArrowLeft size={14} />
          Voltar ao início
        </button>
      </div>
    </div>
  );
};
