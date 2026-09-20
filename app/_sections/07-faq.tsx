import React from "react";
import { SectionHeader } from "@/_components/ui/section-header";
import { Accordion } from "@/_components/ui/accordion";
import { FAQ_ITEMS } from "@/_data/faq";

export function FAQSection() {
  return (
    <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
      <SectionHeader
        counter="07 / 09"
        eyebrow="FREQUENTLY ASKED QUESTIONS"
        title="Answers to common technical questions"
        description="Everything you need to know about keys, generation limits, Facebook permissions, and editorial workflows."
      />

      <div className="mt-14">
        <Accordion items={FAQ_ITEMS} defaultOpenId="faq-1" />
      </div>
    </section>
  );
}
