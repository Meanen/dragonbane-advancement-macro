const okMessage = '✅';
const failMessage = '❌';
const singularPluralMap = {
  'skill': ['skill', 'skills'],
  'advancement': ['advancement', 'advancements']
};

selectCharAndAdvance();

function selectCharAndAdvance() {
  const char = game.user.character;
  const isTrusted = game.user.isTrusted;
  const isGM = game.user.isGM;


  if (isGM || (!char && isTrusted)) {
    selectCharacterDialog();
    return; // Handled on callback
  }

  if (!char && !isTrusted) {
    toChat('No character selected');
    return;
  }

  advanceCharacterSkills(char);
}

async function advanceCharacterSkills(char) {
  const skills = char?.system?.skills || [];
  const markedSkills = skills
        .filter(s => s.system.advance)
        .filter(s => s.system.value < 18);
  
  if (markedSkills.length === 0) {
    toChat('No advancements selected');
    return;
  }

  Promise.all(markedSkills.map(rollSkill))
      .then(advancements => {
        const attempts = advancements.length;
        const successes = advancements.filter(a => a.success).length;
        
        const header = `<h4>${char.name}</h4><h3>Rolling ${pluralize('advancement', advancements)} for <b>${attempts}</b> ${pluralize('skill', advancements)}</h3>`;
        const message = `${advancements.map(advanceSkill).join('<br>')}`;
        const footer = `<hr>Succeeded on ${successes}/${attempts} ${pluralize('advancement', advancements)}<br>`
          + `${buttons(actor, advancements)}`;

        toChat(header + message + footer);
      }).then(a => {
        $(document).on('click', `.${actor.id}-accept`, accept);
        $(document).on('click', `.${actor.id}-decline`, decline);
      })
      .catch(e => {
        console.error(e);
        toChat('⚠️ Could not roll advancements');
      });
}

async function rollSkill(skill) {
  const current = skill.system.value;
  const roll = await new Roll('1d20').roll();
  const success = roll.total > current && current < 18;

  return {
    name: skill.name,
    roll,
    current,
    success
  };
}

function advanceSkill(advancement) {
  if (advancement.current >= 18) {
    return `<b>${advancement.name}</b> ${failMessage} already 18`;
  }
  return `<b>${advancement.name}</b> ${advancement.success ? okMessage : failMessage} ${toInlineRoll(advancement.roll)} (${advancement.current})`;
}

function toInlineRoll(roll) {
  return roll.toAnchor({classes: ['content-link']}).outerHTML;
}

function toChat(content) {
  ChatMessage.create({
    user: game.user._id,
    content
  });
}

async function selectCharacterDialog() {
  const characters = game.actors.filter(a => a.type==='character');

  const options = characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('\n');
  
  await Dialog.prompt({
    title: 'Advance character skills',
    content: `
        <div class="form-group">
          <label for="characterSelect">Select a character</label>
          <select name="characterSelect">
            <option></option>
            ${options}
          </select>
        </div>
    `,
        callback: async(html) => {
          let charId = html.find('[name="characterSelect"]').val();
          if (!!charId) {
            advanceCharacterSkills(game.actors.get(charId))
          }
    }
  });
}

function buttons(actor, advancements) {
  const skills = advancements
    .filter(a => a.success)
    .map(a => a.name)
    .join(",");
  return `<div class="card-buttons" data-skills="${skills}">
    <button style="width:48%" data-actor-id=${actor.id} class="${actor.id}-accept">Advance</button>
    <button style="width:48%" data-actor-id=${actor.id} class="${actor.id}-decline">Dismiss</button>
  </div>`;
}

function pluralize(key, list) {
  return singularPluralMap[key][Math.sign(list.length-1)];
}

function isNil(o) {
  return o === null || o === undefined;
}

function accept(event) {
  const isGM = game.user.isGM;
  const messageActor = event.target.attributes['data-actor-id'].value;
  let currentActor = game.user.character;

  if (!isGM && messageActor !== currentActor.id) {
    // TODO whisper?
    toChat("You can't access this character");
  }

  if (isGM) {
    currentActor = game.actors.get(messageActor);
  }

  const skillsToImprove = event.target.parentNode.dataset.skills.split(',');

  currentActor.system.skills
    .filter(skill => skill.system.advance)
    .forEach(skill => {
      const currVal = skill.system.value;
      if (skillsToImprove.includes(skill.name)) {
        skill.update({ system: { advance: false, value: currVal+1 }});
      } else {
        skill.update({ system: { advance: false }});
      }
    });

  const messageId = event.target.parentNode.parentNode.parentNode.attributes['data-message-id'].value;
  const message = game.messages.get(messageId);
  message.update({content: clearButtons(message, "<b>Changes applied</b>")});
}

  function decline(event) {
    const messageId = event.target.parentNode.parentNode.parentNode.attributes['data-message-id'].value;
    const message = game.messages.get(messageId);
    message.update({content: clearButtons(message, "<b>PLZ IGNORE</b>")});
  }

function clearButtons(message, replace='') {
  return message.content.replaceAll(/(\s+<button.*<\/button>\n?){2}/g, replace);
}
