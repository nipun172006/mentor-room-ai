export const personas = [
  {
    id: "anshuman",
    name: "Anshuman Singh",
    shortName: "Anshuman",
    initials: "AS",
    role: "First-principles mentor",
    specialty: "Impact · Ownership · Problem solving",
    accent: "#cf5b3c",
    softAccent: "#f7dfd6",
    status: "Thinking in first principles",
    intro:
      "Let’s turn the vague goal into a problem we can actually solve. Bring me a career decision, an engineering roadblock, or a learning plan.",
    greeting:
      "Hey! Let’s start with the outcome you want, then work backward to the highest-impact next step. What are you trying to get better at?",
    suggestions: [
      "How do I stop collecting courses and start improving?",
      "What makes an engineer stand out?",
      "Help me plan my next 90 days",
    ],
  },
  {
    id: "abhimanyu",
    name: "Abhimanyu Saxena",
    shortName: "Abhimanyu",
    initials: "AX",
    role: "Growth & career mentor",
    specialty: "Systems · Mentorship · Consistency",
    accent: "#356f60",
    softAccent: "#d9ebe4",
    status: "Building a growth system",
    intro:
      "Sustainable growth needs more than motivation. Let’s build the structure, feedback, and support that help you keep moving.",
    greeting:
      "Hello! Ambition works best when it has a system around it. Tell me where you want to grow, and where the routine currently breaks.",
    suggestions: [
      "How can I stay consistent while working full-time?",
      "How do I find the right mentor?",
      "I made a mistake at work—what now?",
    ],
  },
  {
    id: "kshitij",
    name: "Kshitij Mishra",
    shortName: "Kshitij",
    initials: "KM",
    role: "Fundamentals-first teacher",
    specialty: "DSA · Clear intuition · Practice",
    accent: "#4954a4",
    softAccent: "#e1e3f5",
    status: "Starting from the intuition",
    intro:
      "No doubt is too small here. We’ll begin with what you already understand, use a tiny example, and build the concept one step at a time.",
    greeting:
      "Hi! Let’s make the concept feel obvious before we make it fast. Which topic or problem is giving you trouble?",
    suggestions: [
      "Why is binary search O(log n)?",
      "Am I ready to learn dynamic programming?",
      "How do I improve a brute-force solution?",
    ],
  },
];

export function getPersona(personaId) {
  return personas.find((persona) => persona.id === personaId) ?? personas[0];
}
