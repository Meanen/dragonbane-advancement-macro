advanceCharacterSkills();

async function advanceCharacterSkills() {
  const char = game.user.character;
  const actor = game.actors.get(char.id);
  const skills = char.system.coreSkills;
  const markedSkills = skills.filter(s => s.system.advance);

  if (markedSkills.length === 0) {
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({token: actor}),
      content: 'No advancements selected'
    });

    return;
  }

  const advancementsPromise = await markedSkills.map(async (skill) => {
    const goal = skill.system.value;
    const roll = await new Roll('1d20').roll();
    const result = roll.dice[0].results[0].result;
    const isSuccess = result > goal;
    return { name: skill.name, roll: result, success: isSuccess };
  });

  Promise.all(advancementsPromise).then(advancements => {
    const prefix = `Rolling advancements for <b>${markedSkills.length}</b> skills<br><br>`
    const output = prefix + advancements.map(advancement => `${advancement.name} ${advancement.success ? '✅ advances' : '❌ doesn\'t advance'} with roll [[${advancement.roll}]]`).join('<br>');
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({token: actor}),
      content: output
    });
  });
}
