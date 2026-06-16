import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  Download,
} from 'lucide-react';
import { CompanyLayout } from '@/components/layout/CompanyLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getTalentProfile } from '@/services/api';
import { CANDIDATE_TYPE_LABELS } from '@/utils/cn';
import type { TalentProfile } from '@/types';

/* ─────────────────────────────────────────────
   PDF generation (client-side, no dependency on
   profile.pdfUrl which may be absent/unformatted)
   Uses the browser's print API via a hidden iframe
   so the output is a fully styled, printable resume.
───────────────────────────────────────────── */
function generateResumePdf(profile: TalentProfile) {
  const candidateLabel =
    CANDIDATE_TYPE_LABELS[profile.candidateType ?? ''] ?? profile.candidateType ?? '';

  // Section heading: blue, uppercase, small, bold — then a full-width rule
  const section = (title: string, body: string) => `
    <div style="margin-bottom:22px;">
      <div style="font-size:10.5px;font-weight:700;color:#2255b0;letter-spacing:1px;
           text-transform:uppercase;margin-bottom:4px;">
        ${title}
      </div>
      <div style="border-top:1px solid #ccc;margin-bottom:10px;"></div>
      ${body}
    </div>`;

  const skills = (profile.skills ?? []).join(' · ');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Currículo – ${profile.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12.5px;
      color: #222;
      background: #fff;
      padding: 0;
    }
    @page { margin: 18mm 20mm; }
  </style>
</head>
<body>

  <!-- HEADER: name + contact, plain -->
  <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #ccc;">
    <h1 style="font-size:22px;font-weight:700;color:#111;margin-bottom:5px;">
      ${profile.name}
    </h1>
    <div style="font-size:11.5px;color:#555;line-height:1.8;">
      ${[profile.email, profile.phone].filter(Boolean).join(' · ')}
      ${candidateLabel ? `<br/>${candidateLabel}` : ''}
    </div>
  </div>

  ${profile.summary
    ? section(
        'Objetivo Profissional',
        `<p style="color:#333;line-height:1.65;font-size:12.5px;">${profile.summary}</p>`
      )
    : ''}

  ${profile.education?.length
    ? section(
        'Formação Acadêmica',
        profile.education
          .map(
            (e) =>
              `<div style="margin-bottom:6px;font-size:12.5px;color:#333;">${e}</div>`
          )
          .join('')
      )
    : ''}

  ${profile.experience?.length
    ? section(
        'Experiência Profissional',
        profile.experience
          .map(
            (e) =>
              `<div style="margin-bottom:6px;font-size:12.5px;color:#333;">${e}</div>`
          )
          .join('')
      )
    : ''}

  ${profile.skills?.length
    ? section(
        'Habilidades',
        `<div style="color:#333;font-size:12.5px;line-height:1.7;">${skills}</div>`
      )
    : ''}

  <!-- FOOTER -->
  <div style="margin-top:40px;border-top:1px solid #ddd;padding-top:8px;
       text-align:center;font-size:9.5px;color:#aaa;letter-spacing:.3px;">
    Gerado pelo Sistema — ${new Date().toLocaleDateString('pt-BR')}
  </div>

</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  // Give the browser a tick to render before printing
  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    // Remove iframe after dialog closes (best-effort)
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 400);
}

/* ─────────────────────────────────────────────
   Page component
───────────────────────────────────────────── */
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

  if (!profile) {
    return (
      <CompanyLayout>
        <p className="text-gray-400 text-center mt-20">Candidato não encontrado.</p>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="max-w-3xl mx-auto space-y-4 px-4 sm:px-0 pb-10">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-primary transition-all flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-primary">Currículo do Candidato</h1>
        </div>

        {/* ── Hero card ── */}
        <Card className="p-4 sm:p-5">
          {/* Mobile: stacked; Desktop: row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">

            {/* Avatar + info block */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={28} className="text-primary" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-primary leading-tight truncate">
                  {profile.name}
                </h2>

                {/* Contact info: wraps naturally on mobile */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs sm:text-sm text-gray-500">
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone}`}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Phone size={12} />
                      {profile.phone}
                    </a>
                  )}
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Mail size={12} />
                      <span className="truncate max-w-[180px]">{profile.email}</span>
                    </a>
                  )}
                </div>

                {profile.candidateType && (
                  <div className="mt-2">
                    <Badge variant="accent">
                      {CANDIDATE_TYPE_LABELS[profile.candidateType] ?? profile.candidateType}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Download button: full-width on mobile, auto on desktop */}
            <div className="w-full sm:w-auto">
              <button
                onClick={() => generateResumePdf(profile)}
                className="w-full sm:w-auto flex items-center justify-center gap-2
                  px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold
                  hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
              >
                <Download size={15} />
                Baixar Currículo PDF
              </button>
            </div>

          </div>
        </Card>

        {/* ── Summary ── */}
        {profile.summary && (
          <Card>
            <h3 className="font-semibold text-primary mb-2">Resumo</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{profile.summary}</p>
          </Card>
        )}

        {/* ── Skills ── */}
        {profile.skills && profile.skills.length > 0 && (
          <Card>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Wrench size={15} />
              Habilidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <Badge key={s} variant="primary">{s}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* ── Experience ── */}
        {profile.experience && profile.experience.length > 0 && (
          <Card>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Briefcase size={15} />
              Experiência
            </h3>
            <ul className="space-y-2.5">
              {profile.experience.map((e, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Education ── */}
        {profile.education && profile.education.length > 0 && (
          <Card>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <GraduationCap size={15} />
              Formação
            </h3>
            <ul className="space-y-2.5">
              {profile.education.map((e, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
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