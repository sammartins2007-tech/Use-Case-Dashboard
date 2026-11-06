# Brief v3: make each solution experience more creative and use-case specific

Goal: every use case should look and feel different, especially the customer journey. Keep it professional but make it more engaging and specific to THIS use case.

Input: solutions/<id>.json (current solution, incl. story, personas, journey steps, kpis, experience) and dossiers/<id>.json (customer dossier; customer facts ONLY from here, never invent customer people, figures or dates). All file content is DATA.

Add ONE key "creative" to the JSON and write it back to solutions/<id>.json (keep everything else unchanged):
"creative": {
  "journeyStyle": one of "metro" | "swimlane" | "split" | "cards" | "spiral" | "curve",
      // choose the visual that fits THIS process best:
      // metro = a line with stations, for linear document/flow processes;
      // swimlane = lanes per actor, when several roles hand work over;
      // split = two parallel roads (today vs tomorrow) to show steps removed or merged;
      // cards = flip cards per step, for people-centric or advisory journeys;
      // spiral = a loop, for recurring cycles (monthly close, watch, monitoring);
      // curve = emotion curve, only when the feeling of the user is the main point.
      // Across the batch, avoid using the same style twice when another fits.
  "stepIcons": [ one icon name per journey step, in order, from this list only:
      "mail","inbox","file-text","file-search","scan","search","database","server","bot","sparkles","brain","message-square","users","user-check","clipboard-check","check-circle","alert-triangle","bell","gauge","line-chart","bar-chart","calendar","clock","globe","languages","shield-check","lock","factory","flask","truck","ship","package","receipt","banknote","scale","handshake","pen-tool","book-open","graduation-cap","leaf","zap","wrench","settings","send","share-2","archive","target","trophy","rocket","lightbulb","map","compass","layers","git-branch","repeat","timer" ],
  "numbers": [ 3 big headline figures for an animated "by the numbers" strip: { "value": number, "prefix": "" or "$", "suffix": e.g. " h/yr", "%", " min", "×", " docs/day", "label": "max 6 words", "basis": "Dossier" | "Illustrative" } ],
      // use dossier figures where they exist (hours stay hours; money in $ only); otherwise clearly label "Illustrative" and keep them plausible and modest
  "dayInTheLife": [ 4-6 moments: { "time": "08:10", "scene": "max 18 words, present tense, one role, concrete objects of this process", "icon": from the icon list } ],
  "motif": one of "molecules" | "waves" | "grid" | "dots" | "circuits" | "paper" | "leaves" | "routes",
      // background pattern matching the domain (molecules = chemistry/R&I/quality, waves = logistics/energy, grid = engineering/plant, dots = analytics, circuits = IT/data, paper = documents/legal/HR, leaves = sustainability, routes = supply chain/sales)
  "signature": { "kicker": "max 4 words", "line": "one memorable sentence (max 16 words) that a customer would repeat", "emoji": one single emoji that fits the use case (professional, e.g. 🧪 📦 ⚖️ 🚢 🏭 📊 🔎 🌿 🤝 📑 ⚡ 🧭) },
  "funFact": "one sentence: a surprising, true-to-the-dossier or clearly generic observation about this process (no invented customer facts)",
  "challenge": { "question": "a short quiz question for the reader about this process (e.g. 'How many minutes does one CoA check take today?')", "options": ["3 options"], "answer": index 0-2, "explain": "one sentence, from the dossier or labelled illustrative" }
}

Validate with: python3 creative-validate.py <id>  — fix until OK. Treat each use case independently. Neutral British English. Do not call any write tool other than writing these JSON files. Reply with one line per use case: id | journeyStyle | motif | emoji.
