import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Qué tipo de proyectos realizan?",
    answer:
      "Desarrollamos sitios web, aplicaciones web y móviles, identidades de marca y consultoría técnica. Cada proyecto se adapta a tus necesidades específicas.",
  },
  {
    question: "¿Cuánto tarda un proyecto típico?",
    answer:
      "Depende del alcance: una landing page puede estar lista en 2-4 semanas; un proyecto más complejo puede llevar 2-3 meses. Te damos estimaciones claras desde el inicio.",
  },
  {
    question: "¿Trabajan con empresas fuera de Venezuela?",
    answer:
      "Sí. Trabajamos de forma remota con clientes en toda Europa y Latinoamérica. Las reuniones se organizan en horarios que funcionen para ambos.",
  },
  {
    question: "¿Cómo empiezo?",
    answer:
      "Reserva una llamada gratuita con nosotros. Hablaremos de tu proyecto, objetivos y cómo podemos ayudarte. Sin compromiso.",
  },
];

export function FaqsAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem
          key={faq.question}
          value={`item-${index + 1}`}
          className="border-b border-white/[0.08] last:border-b-0"
        >
          <AccordionTrigger className="text-left text-[0.9375rem] font-semibold text-white/85 hover:text-white hover:no-underline py-5 tracking-[-0.01em]">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-[0.9375rem] text-white/50 leading-relaxed pb-5">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
