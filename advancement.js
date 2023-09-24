advanceCharacterSkills();

async function advanceCharacterSkills() {
  const char = game.user.character;
  const skills = char.system.skills;

  const markedSkills = skills
    .filter(s => s.system.advance)
    .filter(s => s.system.value < 18);

  if (markedSkills.length === 0) {
    toChat('No advancements selected');
    return;
  }

  const advancementsPromise = markedSkills.map(rollSkill);
  Promise.all(advancementsPromise)
    .then(advancements => {
      const prefix = `Rolling advancements for <b>${markedSkills.length}</b> skills<br><br>`;
      const output = prefix + advancements.map(advancement => `${advancement.name} ${advancement.success ? '✅ advances' : '❌ doesn\'t advance'} with roll [[${advancement.roll}]]`).join('<br>');
      toChat(output);
    });
}

async function rollSkill(skill) {
  const goal = skill.system.value;
  const roll = await new Roll('1d20').evaluate();
  const result = roll.dice[0].results[0].result;
  const isSuccess = result > goal;

  return {
    name: skill.name,
    roll: result,
    success: isSuccess
  };
}

function toChat(content) {
  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({ token: game.actors.get(game.user.character.id) }),
    content
  });  
}
