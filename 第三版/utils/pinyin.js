const INITIALS = [
  "zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
  "j", "q", "x", "r", "z", "c", "s", "y", "w"
];

const TONE_MARKS = {
  ā: ["a", "1"], á: ["a", "2"], ǎ: ["a", "3"], à: ["a", "4"],
  ē: ["e", "1"], é: ["e", "2"], ě: ["e", "3"], è: ["e", "4"],
  ī: ["i", "1"], í: ["i", "2"], ǐ: ["i", "3"], ì: ["i", "4"],
  ō: ["o", "1"], ó: ["o", "2"], ǒ: ["o", "3"], ò: ["o", "4"],
  ū: ["u", "1"], ú: ["u", "2"], ǔ: ["u", "3"], ù: ["u", "4"],
  ǖ: ["v", "1"], ǘ: ["v", "2"], ǚ: ["v", "3"], ǜ: ["v", "4"], ü: ["v", "5"]
};

export function normalizePinyin(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/ü/g, "v")
    .replace(/\s+/g, " ");
}

export function toneMarksToNumbers(value) {
  return normalizePinyin(value)
    .split(" ")
    .filter(Boolean)
    .map((syllable) => {
      let tone = "5";
      let plain = "";
      for (const char of syllable) {
        if (TONE_MARKS[char]) {
          plain += TONE_MARKS[char][0];
          tone = TONE_MARKS[char][1];
        } else {
          plain += char;
        }
      }
      return /[1-5]$/.test(plain) ? plain : `${plain}${tone}`;
    })
    .join(" ");
}

export function splitSyllable(syllable) {
  const normalized = toneMarksToNumbers(syllable).replace(/[^a-zv1-5]/g, "");
  const toneMatch = normalized.match(/[1-5]$/);
  const tone = toneMatch ? toneMatch[0] : "5";
  const body = normalized.replace(/[1-5]$/, "");
  const initial = INITIALS.find((item) => body.startsWith(item)) || "";
  const final = body.slice(initial.length);
  return { initial, final, tone, body };
}

export function classifyAttempt(target, input) {
  const targetNorm = toneMarksToNumbers(target);
  const inputNorm = toneMarksToNumbers(input);
  const targetParts = targetNorm.split(" ").filter(Boolean);
  const inputParts = inputNorm.split(" ").filter(Boolean);

  if (!inputNorm) {
    return {
      isCorrect: false,
      errorType: "missing syllable",
      message: "No attempt was entered. Ask the learner to try the full syllable out loud, then type what they said."
    };
  }

  if (targetNorm === inputNorm) {
    return {
      isCorrect: true,
      errorType: "correct",
      message: "Correct. Keep the same initial, final, and tone."
    };
  }

  if (targetParts.length !== inputParts.length) {
    return {
      isCorrect: false,
      errorType: "missing syllable",
      message: `Expected ${targetParts.length} syllable(s), but got ${inputParts.length}. Practice each syllable separately first.`
    };
  }

  for (let index = 0; index < targetParts.length; index += 1) {
    const expected = splitSyllable(targetParts[index]);
    const actual = splitSyllable(inputParts[index]);

    if (expected.initial !== actual.initial) {
      return {
        isCorrect: false,
        errorType: "consonant",
        message: `The initial consonant should be "${expected.initial || "none"}". Listen for the mouth position at the start of the syllable.`
      };
    }

    if (expected.final !== actual.final) {
      return {
        isCorrect: false,
        errorType: "vowel",
        message: `The final should be "${expected.final}". Stretch the vowel/final and compare it with the model pronunciation.`
      };
    }

    if (expected.tone !== actual.tone) {
      return {
        isCorrect: false,
        errorType: "tone",
        message: `The tone should be tone ${expected.tone}. Replay the model and focus on pitch movement.`
      };
    }
  }

  return {
    isCorrect: false,
    errorType: "vowel",
    message: "The syllable is close, but not an exact pinyin match. Check spelling and tone number."
  };
}
