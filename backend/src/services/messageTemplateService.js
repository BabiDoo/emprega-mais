export const whatsappMessageTemplates = {
  welcome: {
    order: 1,
    label: 'Saudacao',
    text: `Olá!
Eu sou o assistente virtual da plataforma Emprega +.
Vou te ajudar a criar o seu perfil e currículo para o nosso banco de talentos focado em profissionais 60+ e PcD.
Aqui você pode responder digitando ou enviando mensagens de áudio, o que for mais fácil para você!
Podemos começar?`,
  },
  ask_name: {
    order: 2,
    label: 'Nome',
    text: `Perfeito!
Para começarmos o seu cadastro, me diga o seu nome completo, por favor.
(Lembrando que você pode digitar ou simplesmente enviar uma mensagem de áudio!)`,
  },
  ask_age: {
    order: 3,
    label: 'Publico',
    text: `Obrigado!
Agora, me diga: qual é a sua idade?
(Lembrando que a nossa plataforma é um espaço exclusivo para apoiar profissionais com 60 anos ou mais e/ou pessoas com deficiência - PcD).
Se preferir, pode responder por áudio!`,
  },
  ask_birth_date: {
    order: 4,
    label: 'Nascimento',
    text: `Ótimo!
E qual é a sua data de nascimento?
(Se preferir, pode falar o dia, o mês e o ano em um áudio rápido!)`,
  },
  ask_is_pcd: {
    order: 5,
    label: 'Identificacao PcD',
    text: `Você é uma pessoa com deficiência (PcD)?
Se sim, pode me contar qual é o tipo de deficiência ou se há alguma necessidade específica que você gostaria de informar?
Essa informação é muito importante, pois nos ajuda a buscar as vagas mais adequadas, acolhedoras e acessíveis para você!
(Fique à vontade para responder digitando ou por áudio).`,
  },
  ask_accessibility_needs: {
    order: 6,
    label: 'Acessibilidade',
    text: `Você precisa de alguma adaptação, recurso de acessibilidade ou condição específica no ambiente de trabalho para realizar as suas atividades?
Se não precisar de nada específico, pode responder apenas 'não'.
(Lembrando que você também pode responder essa mensagem por áudio!)`,
  },
  ask_city_state: {
    order: 7,
    label: 'Localizacao',
    text: `Em qual cidade e estado você mora?
(Se preferir, pode responder enviando um áudio rápido com o nome da sua cidade!)`,
  },
  ask_professional_history: {
    order: 8,
    label: 'Experiencia',
    text: `Agora me conte: com o que você trabalha ou já trabalhou?
Qual é a sua profissão ou área de experiência?
Fique super à vontade para falar livremente por áudio, me contando um pouquinho da sua história profissional!`,
  },
  ask_current_goal: {
    order: 9,
    label: 'Objetivo',
    text: `E hoje, que tipo de trabalho você está buscando?
Pode ser algo que você já fez ou uma área nova.`,
  },
  ask_education: {
    order: 10,
    label: 'Formacao',
    text: `Você fez algum curso ou estudo que queira contar?
Vale curso técnico, curso rápido ou o que aprendeu na prática.
Se não fez, sem problema.`,
  },
  ask_skills: {
    order: 11,
    label: 'Habilidades',
    text: `Estamos quase no fim!
O que você faz bem?
Pode ser lidar com pessoas, organizar, cuidar, resolver problemas…`,
  },
  generating_resume: {
    order: 12,
    label: 'Processamento',
    text: `Perfeito, já tenho tudo o que preciso!
Me dê um instante enquanto monto o seu currículo.`,
  },
  completed: {
    order: 13,
    label: 'Conclusao',
    text: `Prontinho!
Seu currículo está criado e você já faz parte do banco de talentos da Emprega +.
Quando surgir uma vaga com a sua cara, te aviso por aqui.
Boa sorte!`,
  },
};

export function getWhatsappTemplate(step) {
  return whatsappMessageTemplates[step] || null;
}

export function getWhatsappTemplateText(step) {
  return getWhatsappTemplate(step)?.text || null;
}

export function getWhatsappTemplateMetadata(step) {
  const template = getWhatsappTemplate(step);

  if (!template) return {};

  return {
    templateOrder: template.order,
    templateLabel: template.label,
    templateSource: 'Templates Emprega +.pdf',
  };
}
