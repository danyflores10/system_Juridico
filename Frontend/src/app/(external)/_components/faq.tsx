"use client";

import { type FormEvent, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { FadeUp, SlideIn } from "./fade-up";
import { WHATSAPP_LOCAL, whatsappMessageLink } from "./landing-config";

const faqs = [
  {
    q: "¿Cómo agendo una cita o asesoría?",
    a: `Puede solicitarla desde el formulario de esta página, por WhatsApp al ${WHATSAPP_LOCAL} o llamando directamente. Confirmamos fecha y hora el mismo día y le enviamos un recordatorio antes de la reunión.`,
  },
  {
    q: "¿Atienden consultas virtuales?",
    a: "Sí. Ofrecemos asesorías por videollamada con la misma calidad y validez que una reunión presencial. Ideal para clientes con agendas exigentes o que se encuentran en otra ciudad.",
  },
  {
    q: "¿Cómo protegen mi información?",
    a: "Toda su información se resguarda en nuestro sistema con acceso controlado por usuarios y roles: solo el personal autorizado de su caso puede verla. Además, mantenemos respaldo digital y estricta confidencialidad profesional.",
  },
  {
    q: "¿Puedo hacer seguimiento a mi caso?",
    a: "Sí. Recibirá reportes periódicos del estado de su caso y, según su plan, acceso al portal del cliente para consultar avances, documentos y próximas audiencias en cualquier momento.",
  },
  {
    q: "¿Qué áreas del derecho cubren?",
    a: "Atendemos derecho civil, penal, laboral, de familia, corporativo, tributario, notarial y constitucional, entre otros. Si su caso requiere una especialidad distinta, lo orientamos con total transparencia.",
  },
  {
    q: "¿Cuánto cuestan los servicios?",
    a: "La primera evaluación de su caso no tiene costo. Luego puede optar por una consulta puntual o por un plan mensual; siempre conocerá los honorarios por adelantado, sin sorpresas.",
  },
];

function AccordionItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="border-[#16233d] border-b"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-start justify-between gap-4 py-6 text-left"
        aria-expanded={open}
      >
        <span
          className={`font-semibold text-base transition-colors duration-200 ${
            open ? "text-[#d4af37]" : "text-white group-hover:text-white/80"
          }`}
        >
          {q}
        </span>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
            open
              ? "border-[#d4af37] bg-[#d4af37] text-[#081020]"
              : "border-[#2b3d63] text-white/50 group-hover:border-[#3e5484]"
          }`}
        >
          {open ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm text-white/60 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Faq() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = `Hola, soy ${name}. Solicito una asesoría jurídica.\n\nCorreo: ${email}\nConsulta: ${message}`;
    window.open(whatsappMessageLink(text), "_blank", "noopener,noreferrer");
    toast.success("¡Consulta enviada! Le responderemos a la brevedad.");
    setSubmitted(true);
  };

  return (
    <section id="contacto" className="lj-section bg-[#081020]">
      <div className="lj-container">
        <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
          {/* Preguntas frecuentes */}
          <div>
            <FadeUp>
              <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
                Preguntas frecuentes
              </span>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="lj-font-heading mb-10 font-black text-3xl text-white uppercase sm:text-4xl md:text-5xl">
                Resolvemos
                <br />
                <span className="text-[#d4af37]">sus dudas</span>
              </h2>
            </FadeUp>
            <div>
              {faqs.map((faq, i) => (
                <AccordionItem key={faq.q} q={faq.q} a={faq.a} index={i} />
              ))}
            </div>
          </div>

          {/* Formulario de contacto */}
          <SlideIn direction="right">
            <div className="rounded-2xl border border-[#16233d] bg-[#0f1c33] p-8 md:p-10">
              <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
                Contáctenos
              </span>
              <h3 className="lj-font-heading mb-2 font-black text-3xl text-white uppercase leading-tight md:text-4xl">
                Solicite su
                <br />
                asesoría hoy
              </h3>
              <p className="mb-8 text-sm text-white/50">
                Escríbanos su consulta y un consultor jurídico le responderá en menos de 24 horas.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d4af37]">
                    <Send size={24} className="text-[#081020]" />
                  </div>
                  <h4 className="lj-font-heading mb-2 font-black text-2xl text-white uppercase">¡Consulta enviada!</h4>
                  <p className="text-sm text-white/50">
                    Un consultor jurídico se comunicará con usted en menos de 24 horas.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="lj-nombre"
                        className="mb-2 block font-semibold text-white/40 text-xs uppercase tracking-wider"
                      >
                        Nombre completo
                      </label>
                      <input
                        id="lj-nombre"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej.: María Fernández"
                        className="w-full rounded-xl border border-[#1c2a47] bg-[#081020] px-4 py-3 text-sm text-white transition-colors placeholder:text-white/40 focus:border-[#d4af37]/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lj-correo"
                        className="mb-2 block font-semibold text-white/40 text-xs uppercase tracking-wider"
                      >
                        Correo electrónico
                      </label>
                      <input
                        id="lj-correo"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="maria@correo.com"
                        className="w-full rounded-xl border border-[#1c2a47] bg-[#081020] px-4 py-3 text-sm text-white transition-colors placeholder:text-white/40 focus:border-[#d4af37]/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lj-mensaje"
                      className="mb-2 block font-semibold text-white/40 text-xs uppercase tracking-wider"
                    >
                      Su consulta
                    </label>
                    <textarea
                      id="lj-mensaje"
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Cuéntenos brevemente su caso o consulta legal..."
                      className="w-full resize-none rounded-xl border border-[#1c2a47] bg-[#081020] px-4 py-3 text-sm text-white transition-colors placeholder:text-white/40 focus:border-[#d4af37]/50 focus:outline-none"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="lj-font-heading flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] py-4 font-black text-[#081020] text-sm uppercase tracking-wider transition-all duration-200 hover:bg-[#e2c04d] hover:shadow-[0_0_25px_rgba(212,175,55,0.35)]"
                  >
                    Enviar consulta <Send size={14} />
                  </motion.button>

                  <p className="text-center text-white/30 text-xs">
                    Al enviar, su consulta se abrirá en WhatsApp para una atención inmediata.
                  </p>
                </form>
              )}
            </div>
          </SlideIn>
        </div>
      </div>
    </section>
  );
}
