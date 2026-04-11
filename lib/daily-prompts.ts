// ═══════════════════════════════════════════════════════════
// BLUNNIT DAILY PROMPTS — 100 Prompts
// Date-based rotation. Same prompt for all users on the same day.
// Each prompt rooted in BLUNNIT protocol philosophy.
// ═══════════════════════════════════════════════════════════

const DAILY_PROMPTS = [
  // THE SCRIPT (Automatic patterns)
  "What did you do today that you didn't actually decide to do?",
  "What is one thing you said today out of habit instead of honesty?",
  "When was the last time you reacted before you had time to think?",
  "What is a version of yourself you perform for other people?",
  "What do you do on autopilot that you've never questioned?",
  "What opinion do you hold that you've never actually tested?",
  "What behavior do you repeat even though it hasn't worked in years?",
  "When did you last say yes when you meant no?",
  "What part of your daily routine exists because of fear, not choice?",
  "What would someone learn about you by watching what you avoid?",
  "Who were you before you started performing for the room?",
  "What conversation do you rehearse in your head that never actually happens?",
  "What rule are you following that nobody asked you to follow?",
  "What belief do you carry that you inherited instead of chose?",
  "What would change if you stopped doing what's expected of you for one day?",
  // THE GAP (Space between stimulus and response)
  "When was the last time you paused before reacting?",
  "What is one emotion that takes over before you can catch it?",
  "How quickly do you reach for your phone when discomfort arrives?",
  "What would happen if you waited three seconds before responding to something that upset you?",
  "What fills the silence when you're alone with nothing to do?",
  "What is the first thing your mind does when someone criticizes you?",
  "When was the last time you sat with a feeling instead of fixing it?",
  "What happens in your body right before you avoid something?",
  "What thought always shows up first thing in the morning before you choose it?",
  "How often do you catch yourself mid-reaction versus after it's already happened?",
  // FRICTION POINTS (Specific triggers)
  "What situation reliably makes you tense, every time?",
  "Who in your life triggers a reaction in you that feels out of proportion?",
  "What topic do you change the subject from most often?",
  "What kind of text or message makes your chest tighten before you open it?",
  "What type of social situation makes you perform the hardest?",
  "What task do you keep postponing, and what happens in your body when you think about starting it?",
  "What does your inner voice say to you when you make a mistake?",
  "What is the most recent moment where your reaction surprised you?",
  "When do you feel most like you're pretending?",
  "What is a situation where you consistently act against your own interest?",
  // FEAR AND SOURCE (What powers the pattern)
  "What are you actually afraid of right now, underneath everything else?",
  "What outcome are you organizing your life to avoid?",
  "If the thing you fear most happened tomorrow, what would actually change?",
  "What is the worst thing someone could think about you, and why does that specific thing carry weight?",
  "What are you protecting that might not need protecting anymore?",
  "What fear do you carry that made sense when you were younger but doesn't fit your life now?",
  "What would you attempt if failure had no audience?",
  "What risk have you been calculating for too long instead of taking or releasing?",
  "What would be different if you trusted yourself as much as you trust your doubt?",
  "What discomfort are you treating as danger?",
  "What do you keep bracing for that hasn't actually happened?",
  "What is the fear beneath your need to be right?",
  "Where in your life are you choosing safety over honesty?",
  // THE ILLUSION (Assumptions mistaken for truth)
  "What are you certain about that you've never actually verified?",
  "What assumption about yourself are you living as though it's fact?",
  "What story do you tell about your past that might not be the full picture?",
  "What do you believe about other people that says more about you than them?",
  "Where are you confusing a feeling with a fact?",
  "What certainty in your life might actually be a habit?",
  "What would collapse in your self-image if you let go of one specific belief?",
  "What narrative are you maintaining that requires constant energy to hold up?",
  "What are you adding to a situation that a camera wouldn't record?",
  "What do you assume other people are thinking about you, and what evidence do you actually have?",
  "What label have you given yourself that limits what you're willing to try?",
  "What would you see differently if you removed the story and kept only the facts?",
  "Where are you treating an interpretation as the truth?",
  "What would you have to face if your favorite excuse disappeared?",
  // FACT VS. STORY (Separating what happened from what you added)
  "Think of something that bothered you recently. What actually happened versus what you decided it meant?",
  "What is a conflict you're in where you might be reacting to your version of events instead of the events themselves?",
  "What did someone do recently that you assigned meaning to without asking them about it?",
  "What is one thing you believe about a relationship in your life that you've never confirmed out loud?",
  "What is a fact about your current situation that you keep decorating with a story?",
  "If you described your biggest problem using only things a camera could see, what would be left?",
  "What emotion are you treating as evidence of something being true?",
  "What story are you telling yourself about why something hasn't worked out?",
  "What did you feel today that you treated as a fact about the world instead of information about yourself?",
  "When was the last time you checked whether your interpretation of someone's behavior was accurate?",
  // CATCH, CHECK, CHOOSE (The operating system)
  "What is one reaction you caught today before it ran its full course?",
  "What activated in you today that you noticed but didn't follow?",
  "Think of a moment today where you reacted automatically. What would you do differently if you ran it again?",
  "What is one thing you chose deliberately today instead of defaulting to habit?",
  "Where did you separate what you know from what you were adding today?",
  "What impulse did you feel today that you let pass without acting on it?",
  "What automatic response did you override today, and what did you replace it with?",
  "What is one pattern that fired today that you recognized by name?",
  "Where did you hold the gap today, even for a second?",
  "What would your day have looked like if every response was deliberate instead of automatic?",
  // THE BLADE AND THE HEART (Precision with compassion)
  "Where are you being sharp with others but not honest with yourself?",
  "Who in your life is running a pattern they can't see, and how does that affect you?",
  "What would change if you stopped expecting other people to be further along than they are?",
  "Where are you using clarity as a weapon instead of a tool?",
  "What would it look like to hold someone accountable without making them wrong?",
  "What is the difference between seeing someone clearly and judging them?",
  "Where are you withholding compassion from yourself that you'd offer freely to someone else?",
  "What boundary do you need to hold that has nothing to do with the other person being bad?",
  "When was the last time you stayed grounded while someone else was reactive?",
  "What would it cost you to see the person behind someone's worst behavior?",
  // THE STILL POINT, INTERBEING, AND SOVEREIGNTY
  "Where are you taking responsibility for someone else's reaction instead of your own?",
  "Where are you absorbing someone else's state instead of holding your own?",
  "What would it feel like to be fully responsible for your inner state and fully compassionate toward someone else's, at the same time?",
  "What pattern in someone else's behavior do you recognize because you've run the same one?",
  "What would staying in a difficult room without absorbing it or leaving it look like for you today?",
  "What is one thing you could release today that you've been carrying for someone else?",
  "What tension in your life might not need to be resolved, just held?",
  "What do you hear when the noise stops?",
];

export function getDailyPrompt(): string {
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return DAILY_PROMPTS[daysSinceStart % DAILY_PROMPTS.length];
}

export default DAILY_PROMPTS;
