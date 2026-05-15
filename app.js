var chat = document.getElementById('chat');
var inputField = document.getElementById('inputField');
var sendBtn = document.getElementById('sendBtn');
var inputLabel = document.getElementById('inputLabel');
var step = 0;
var manifest = {};
var busy = false;

inputField.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

inputField.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

sendBtn.addEventListener('click', handleSend);

function scroll() {
  setTimeout(function () {
    chat.scrollTop = chat.scrollHeight;
  }, 30);
}

function addRow(prefix, html, type, delay) {
  type = type || 'system';
  delay = delay || 0;

  return new Promise(function (res) {
    setTimeout(function () {
      var d = document.createElement('div');
      d.className = 'msg' + (type === 'user' ? ' msg-user' : '');
      d.innerHTML =
        '<div class="msg-row">' +
          '<div class="msg-prefix">' + prefix + '</div>' +
          '<div class="msg-content">' + html + '</div>' +
        '</div>';
      chat.appendChild(d);
      scroll();
      res();
    }, delay);
  });
}

function addComment(text, delay) {
  delay = delay || 0;

  return new Promise(function (res) {
    setTimeout(function () {
      var d = document.createElement('div');
      d.className = 'msg msg-comment';
      d.textContent = text;
      chat.appendChild(d);
      scroll();
      res();
    }, delay);
  });
}

function addStepBar(label, current) {
  var d = document.createElement('div');
  d.className = 'step-bar';

  var dots = '';
  for (var i = 0; i < 6; i++) {
    var cls = i < current ? 'done' : (i === current ? 'active' : '');
    dots += '<span class="step-dot ' + cls + '"></span>';
  }

  d.innerHTML =
    '<span class="line"></span>' +
    dots +
    '<span class="step-label">' + label + '</span>' +
    dots +
    '<span class="line"></span>';

  chat.appendChild(d);
  scroll();
}

function showTyping() {
  var d = document.createElement('div');
  d.className = 'typing show';
  d.id = 'typing';
  d.innerHTML =
    '<span class="typing-label">ambassador</span>' +
    '<div class="typing-dot"></div>' +
    '<div class="typing-dot"></div>' +
    '<div class="typing-dot"></div>';
  chat.appendChild(d);
  scroll();
}

function hideTyping() {
  var t = document.getElementById('typing');
  if (t) t.remove();
}

function lock() {
  busy = true;
  inputField.disabled = true;
  sendBtn.disabled = true;
}

function unlock() {
  busy = false;
  inputField.disabled = false;
  sendBtn.disabled = false;
  inputField.focus();
}

function handleSend() {
  if (busy) return;

  var val = inputField.value.trim();
  if (!val) return;

  addRow('you', escapeHtml(val), 'user');
  inputField.value = '';
  inputField.style.height = 'auto';

  lock();
  showTyping();

  setTimeout(function () {
    hideTyping();
    processStep(step, val);
  }, 700);
}

// Generic handler for button-based selections.
// value: the actual typed value to store (integer, boolean, or string enum).
// label: optional display string shown in chat; defaults to String(value).
function pickBtn(value, label) {
  document.querySelectorAll('.autonomy-btn').forEach(function (b) {
    b.disabled = true;
  });
  var display = label !== undefined ? label : String(value);
  addRow('you', escapeHtml(display), 'user');
  lock();
  showTyping();
  setTimeout(function () {
    hideTyping();
    processStep(step, value);
  }, 700);
}

// Renders the audit logging question and buttons.
// Called from two places: after stores_personal_data=false and after retention is collected.
// At call time, step is already set to 13.
function showAuditLoggingStep() {
  setTimeout(function () {
    addRow('ambassador', 'How is this agent\'s activity logged?').then(function () {
      inputLabel.textContent = 'Audit logging';
      inputField.value = '';
      inputField.placeholder = 'Or type: none, basic, detailed';

      setTimeout(function () {
        var opts = ['none', 'basic', 'detailed'];
        var d = document.createElement('div');
        d.className = 'msg';
        var btns = '<div class="autonomy-opts">';
        opts.forEach(function (o) {
          btns += '<button class="autonomy-btn" onclick="pickBtn(\'' + escapeJs(o) + '\')">' + escapeHtml(o) + '</button>';
        });
        btns += '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 400);
    });
  }, 400);
}

// Internal step index → v1.0 field collected:
//  0  agent_name
//  1  agent_version
//  2  purpose.primary_code
//  3  purpose.description
//  4  forbidden_actions
//  5  autonomy.level  (integer 0-3)
//  6  owner.type
//  7  owner.identifier
//  8  stopping_authority.stoppable_by
//  9  stopping_authority.mechanism
// 10  risk_profile.level
// 11  data_handling.stores_personal_data  (boolean)
// 12  data_handling.retention  (conditional: only if stores_personal_data === true)
// 13  audit_surface.logging
// 14  audit_surface.reconstructability
// 15  contact.email  → generateManifest()
function processStep(s, val) {
  switch (s) {

    case 0: // agent_name
      manifest.agent_name = String(val).trim();
      step = 1;

      addRow('ambassador', 'Declared as <span class="chip">' + escapeHtml(manifest.agent_name) + '</span>.');
      addRow('ambassador', 'Agent version? Press Enter to accept the default.', 'system', 400);
      addComment('e.g. 1.0.0, 2.1.3, beta-1', 600);

      inputLabel.textContent = 'Agent version';
      inputField.value = '1.0.0';
      inputField.placeholder = '1.0.0';

      setTimeout(function () {
        inputField.select();
        unlock();
      }, 700);
      break;

    case 1: // agent_version
      manifest.agent_version = String(val).trim() || '1.0.0';
      step = 2;

      addStepBar('step 2 / 6 -- purpose', 1);
      addRow('ambassador', 'Version <span class="chip">' + escapeHtml(manifest.agent_version) + '</span> declared.');
      addRow('ambassador', 'What is the primary purpose of this agent?', 'system', 400);
      addRow('ambassador', 'Select a purpose code or type a custom one (lowercase, a-z 0-9 . _ -).', 'system', 800);

      inputLabel.textContent = 'Purpose code';
      inputField.value = '';
      inputField.placeholder = 'e.g. assistant, data-analysis, content-review...';

      setTimeout(function () {
        var codes = ['assistant', 'automation', 'research', 'moderation', 'generation', 'analysis'];
        var d = document.createElement('div');
        d.className = 'msg';
        var btns = '<div class="autonomy-opts">';
        codes.forEach(function (c) {
          btns += '<button class="autonomy-btn" onclick="pickBtn(\'' + escapeJs(c) + '\')">' + escapeHtml(c) + '</button>';
        });
        btns += '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 1000);
      break;

    case 2: // purpose.primary_code
      // Schema pattern: ^[a-z0-9._-]+$ with minLength: 2
      var rawCode = String(val).trim().toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!rawCode || rawCode.length < 2) {
        addRow('ambassador', 'Purpose code must be at least 2 characters (lowercase letters, digits, . _ - only). Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.purpose_code = rawCode;
      step = 3;

      addRow('ambassador', 'Purpose code: <span class="chip">' + escapeHtml(manifest.purpose_code) + '</span>.');
      addRow('ambassador', 'Describe the agent\'s purpose in a complete sentence.', 'system', 400);
      addComment('Be specific and bounded. Minimum 10 characters.', 600);

      inputLabel.textContent = 'Purpose description';
      inputField.value = '';
      inputField.placeholder = 'e.g. Validates and routes agent interaction requests before execution...';

      setTimeout(unlock, 700);
      break;

    case 3: // purpose.description
      var desc = String(val).trim();
      if (desc.length < 10) {
        addRow('ambassador', 'Purpose description must be at least 10 characters. Please be more specific.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.purpose_description = desc;
      step = 4;

      addStepBar('step 3 / 6 -- forbidden actions', 2);
      addRow('ambassador', 'Good. What is this agent NOT allowed to do?');
      addRow('ambassador', 'List forbidden actions, one per line or comma-separated.', 'system', 400);
      addComment('e.g. Access user private data, Modify production databases, Execute code without review', 600);

      inputLabel.textContent = 'Forbidden actions';
      inputField.value = '';
      inputField.placeholder = 'One per line, or comma-separated...';

      setTimeout(unlock, 700);
      break;

    case 4: // forbidden_actions  (array, minItems: 1, each minLength: 2)
      var actions = String(val).split(/[\n,]/)
        .map(function (a) { return a.trim(); })
        .filter(function (a) { return a.length >= 2; });
      if (actions.length === 0) {
        addRow('ambassador', 'At least one forbidden action is required (min 2 characters each). Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.forbidden_actions = actions;
      step = 5;

      addStepBar('step 4 / 6 -- autonomy', 3);
      addRow('ambassador', actions.length + ' constraint(s) declared.');
      addRow('ambassador', 'What is the autonomy level of this agent?', 'system', 400);

      inputLabel.textContent = 'Autonomy level';
      inputField.value = '';
      inputField.placeholder = 'Or type 0, 1, 2, or 3...';

      setTimeout(function () {
        var levels = [
          { label: '0 — none (fully supervised)', value: 0 },
          { label: '1 — low (supervised execution)', value: 1 },
          { label: '2 — medium (conditional autonomy)', value: 2 },
          { label: '3 — high (full autonomy)', value: 3 }
        ];
        var d = document.createElement('div');
        d.className = 'msg';
        var btns = '<div class="autonomy-opts">';
        levels.forEach(function (l) {
          btns += '<button class="autonomy-btn" onclick="pickBtn(' + l.value + ', \'' + escapeJs(l.label) + '\')">' + escapeHtml(l.label) + '</button>';
        });
        btns += '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 700);
      break;

    case 5: // autonomy.level  (integer 0-3)
      var level = typeof val === 'number' ? val : parseInt(String(val), 10);
      if (isNaN(level) || level < 0 || level > 3) {
        addRow('ambassador', 'Autonomy level must be 0, 1, 2, or 3. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.autonomy_level = level;
      step = 6;

      addStepBar('step 5 / 6 -- governance', 4);
      addRow('ambassador', 'Autonomy level <span class="chip">' + level + '</span> declared.');
      addRow('ambassador', 'Who owns this agent?', 'system', 400);

      inputLabel.textContent = 'Owner type';
      inputField.value = '';
      inputField.placeholder = 'Or type: individual, organization, system';

      setTimeout(function () {
        var types = ['individual', 'organization', 'system'];
        var d = document.createElement('div');
        d.className = 'msg';
        var btns = '<div class="autonomy-opts">';
        types.forEach(function (t) {
          btns += '<button class="autonomy-btn" onclick="pickBtn(\'' + escapeJs(t) + '\')">' + escapeHtml(t) + '</button>';
        });
        btns += '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 700);
      break;

    case 6: // owner.type  (enum: individual | organization | system)
      var ownerType = String(val).trim().toLowerCase();
      if (ownerType !== 'individual' && ownerType !== 'organization' && ownerType !== 'system') {
        addRow('ambassador', 'Owner type must be one of: individual, organization, system. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.owner_type = ownerType;
      step = 7;

      addRow('ambassador', 'Owner type: <span class="chip">' + escapeHtml(manifest.owner_type) + '</span>.');
      addRow('ambassador', 'What is the owner\'s identifier?', 'system', 400);
      addComment('Name, team, org, or username. e.g. acme-corp, john-doe, ops-team', 600);

      inputLabel.textContent = 'Owner identifier';
      inputField.value = '';
      inputField.placeholder = 'e.g. your-org, your-name, team-name...';

      setTimeout(unlock, 700);
      break;

    case 7: // owner.identifier
      var ownerIdent = String(val).trim();
      if (!ownerIdent) {
        addRow('ambassador', 'Owner identifier is required. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.owner_identifier = ownerIdent;
      step = 8;

      addRow('ambassador', 'Owner: <span class="chip">' + escapeHtml(manifest.owner_identifier) + '</span>.');
      addRow('ambassador', 'Who can stop this agent?', 'system', 400);
      addComment('Roles, entities, or identifiers. e.g. platform-admin, on-call-engineer', 600);

      inputLabel.textContent = 'Stoppable by (comma-separated)';
      inputField.value = '';
      inputField.placeholder = 'e.g. platform-admin, ops-team...';

      setTimeout(unlock, 700);
      break;

    case 8: // stopping_authority.stoppable_by  (array, minItems: 1)
      var stoppable = String(val).split(',')
        .map(function (item) { return item.trim(); })
        .filter(function (item) { return item.length >= 2; });
      if (stoppable.length === 0) {
        addRow('ambassador', 'At least one stopping authority is required. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.stopping_stoppable_by = stoppable;
      step = 9;

      addRow('ambassador', 'Stopping authority declared.');
      addRow('ambassador', 'How can this agent be stopped?', 'system', 400);
      addComment('Describe the mechanism. e.g. Disable feature flag in admin panel, API key revocation', 600);

      inputLabel.textContent = 'Stopping mechanism';
      inputField.value = '';
      inputField.placeholder = 'Describe the stop mechanism...';

      setTimeout(unlock, 700);
      break;

    case 9: // stopping_authority.mechanism  (minLength: 5)
      var mechanism = String(val).trim();
      if (mechanism.length < 5) {
        addRow('ambassador', 'Stopping mechanism must be at least 5 characters. Please be more specific.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.stopping_mechanism = mechanism;
      step = 10;

      addStepBar('step 6 / 6 -- compliance', 5);
      addRow('ambassador', 'Governance declared.');
      addRow('ambassador', 'Self-assessed risk level of this agent?', 'system', 400);

      inputLabel.textContent = 'Risk level';
      inputField.value = '';
      inputField.placeholder = 'Or type: low, medium, high';

      setTimeout(function () {
        var riskLevels = ['low', 'medium', 'high'];
        var d = document.createElement('div');
        d.className = 'msg';
        var btns = '<div class="autonomy-opts">';
        riskLevels.forEach(function (l) {
          btns += '<button class="autonomy-btn" onclick="pickBtn(\'' + escapeJs(l) + '\')">' + escapeHtml(l) + '</button>';
        });
        btns += '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 700);
      break;

    case 10: // risk_profile.level  (enum: low | medium | high)
      var riskLevel = String(val).trim().toLowerCase();
      if (riskLevel !== 'low' && riskLevel !== 'medium' && riskLevel !== 'high') {
        addRow('ambassador', 'Risk level must be one of: low, medium, high. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.risk_level = riskLevel;
      step = 11;

      addRow('ambassador', 'Risk: <span class="chip">' + escapeHtml(manifest.risk_level) + '</span>.');
      addRow('ambassador', 'Does this agent store or persist personal data?', 'system', 400);

      inputLabel.textContent = 'Stores personal data';
      inputField.value = '';
      inputField.placeholder = 'Or type: yes / no';

      setTimeout(function () {
        var d = document.createElement('div');
        d.className = 'msg';
        var btns =
          '<div class="autonomy-opts">' +
          '<button class="autonomy-btn" onclick="pickBtn(true, \'yes\')">yes</button>' +
          '<button class="autonomy-btn" onclick="pickBtn(false, \'no\')">no</button>' +
          '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 700);
      break;

    case 11: // data_handling.stores_personal_data  (boolean)
      var spd;
      if (typeof val === 'boolean') {
        spd = val;
      } else {
        var spdStr = String(val).trim().toLowerCase();
        if (spdStr === 'yes' || spdStr === 'true') {
          spd = true;
        } else if (spdStr === 'no' || spdStr === 'false') {
          spd = false;
        } else {
          addRow('ambassador', 'Please answer yes or no.');
          setTimeout(unlock, 500);
          break;
        }
      }
      manifest.stores_personal_data = spd;

      if (spd) {
        // Schema requires retention when stores_personal_data === true
        step = 12;
        addRow('ambassador', 'Personal data stored: <span class="chip">yes</span>.');
        addRow('ambassador', 'Retention policy?', 'system', 400);
        addComment('ISO 8601 duration (P30D, P1Y, PT12H) or: none, temporary_session_only', 600);

        inputLabel.textContent = 'Retention policy';
        inputField.value = '';
        inputField.placeholder = 'e.g. P30D, P1Y, temporary_session_only, none...';

        setTimeout(unlock, 700);
      } else {
        step = 13;
        addRow('ambassador', 'Personal data: <span class="chip">not stored</span>.');
        showAuditLoggingStep();
      }
      break;

    case 12: // data_handling.retention  (required when stores_personal_data === true)
      var retention = String(val).trim();
      if (!retention) {
        addRow('ambassador', 'Retention policy is required when personal data is stored. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.retention = retention;
      step = 13;

      addRow('ambassador', 'Retention: <span class="chip">' + escapeHtml(manifest.retention) + '</span>.');
      showAuditLoggingStep();
      break;

    case 13: // audit_surface.logging  (enum: none | basic | detailed)
      var auditLog = String(val).trim().toLowerCase();
      if (auditLog !== 'none' && auditLog !== 'basic' && auditLog !== 'detailed') {
        addRow('ambassador', 'Logging must be one of: none, basic, detailed. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.audit_logging = auditLog;
      step = 14;

      addRow('ambassador', 'Logging: <span class="chip">' + escapeHtml(manifest.audit_logging) + '</span>.');
      addRow('ambassador', 'Can actions be reconstructed after execution?', 'system', 400);

      inputLabel.textContent = 'Reconstructability';
      inputField.value = '';
      inputField.placeholder = 'Or type: none, partial, full';

      setTimeout(function () {
        var reconOpts = ['none', 'partial', 'full'];
        var d = document.createElement('div');
        d.className = 'msg';
        var btns = '<div class="autonomy-opts">';
        reconOpts.forEach(function (o) {
          btns += '<button class="autonomy-btn" onclick="pickBtn(\'' + escapeJs(o) + '\')">' + escapeHtml(o) + '</button>';
        });
        btns += '</div>';
        d.innerHTML =
          '<div class="msg-row">' +
            '<div class="msg-prefix">ambassador</div>' +
            '<div class="msg-content">' + btns + '</div>' +
          '</div>';
        chat.appendChild(d);
        scroll();
        unlock();
      }, 700);
      break;

    case 14: // audit_surface.reconstructability  (enum: none | partial | full)
      var reconst = String(val).trim().toLowerCase();
      if (reconst !== 'none' && reconst !== 'partial' && reconst !== 'full') {
        addRow('ambassador', 'Reconstructability must be one of: none, partial, full. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.audit_reconstructability = reconst;
      step = 15;

      addRow('ambassador', 'Reconstructability: <span class="chip">' + escapeHtml(manifest.audit_reconstructability) + '</span>.');
      addRow('ambassador', 'Contact email for accountability and escalation?', 'system', 400);

      inputLabel.textContent = 'Contact email';
      inputField.value = '';
      inputField.placeholder = 'e.g. ai-ops@your-org.com';

      setTimeout(unlock, 700);
      break;

    case 15: // contact.email
      var email = String(val).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        addRow('ambassador', 'A valid email address is required. Please try again.');
        setTimeout(unlock, 500);
        break;
      }
      manifest.contact_email = email;
      step = 16;
      generateManifest();
      break;
  }
}

function highlight(json) {
  var escaped = escapeHtml(json);

  escaped = escaped.replace(
    /(&quot;[\w$@.\-\s]+&quot;)\s*:/g,
    '<span class="jk">$1</span>:'
  );

  escaped = escaped.replace(
    /:\s*(&quot;(?:\\.|[^&]|&(?!quot;))*&quot;)/g,
    ': <span class="js">$1</span>'
  );

  escaped = escaped.replace(
    /([{}\[\]])/g,
    '<span class="jb">$1</span>'
  );

  return escaped;
}

function generateManifest() {
  lock();
  inputLabel.textContent = '--';
  inputField.placeholder = 'Manifest generated.';

  addStepBar('generating manifest', 6);
  showTyping();

  setTimeout(function () {
    hideTyping();

    var dataHandling = { stores_personal_data: manifest.stores_personal_data };
    if (manifest.stores_personal_data === true) {
      dataHandling.retention = manifest.retention;
    }

    var obj = {
      "$schema": "https://agent-manifest-spec.org/spec/v1.0/schema.json",
      "manifest_version": "1.0",
      "agent_id": manifest.agent_name.toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, ''),
      "agent_name": manifest.agent_name,
      "agent_version": manifest.agent_version,
      "owner": {
        "type": manifest.owner_type,
        "identifier": manifest.owner_identifier
      },
      "purpose": {
        "primary_code": manifest.purpose_code,
        "description": manifest.purpose_description
      },
      "forbidden_actions": manifest.forbidden_actions,
      "autonomy": {
        "level": manifest.autonomy_level
      },
      "risk_profile": {
        "level": manifest.risk_level
      },
      "data_handling": dataHandling,
      "stopping_authority": {
        "stoppable_by": manifest.stopping_stoppable_by,
        "mechanism": manifest.stopping_mechanism
      },
      "audit_surface": {
        "logging": manifest.audit_logging,
        "reconstructability": manifest.audit_reconstructability
      },
      "contact": {
        "email": manifest.contact_email
      }
    };

    // Final validation guard before display and submit
    var errors = [];
    if (!obj.agent_name) errors.push('agent_name missing');
    if (!obj.agent_version) errors.push('agent_version missing');
    if (!obj.owner.type || !obj.owner.identifier) errors.push('owner incomplete');
    if (!obj.purpose.primary_code || !obj.purpose.description) errors.push('purpose incomplete');
    if (!obj.forbidden_actions || obj.forbidden_actions.length === 0) errors.push('forbidden_actions empty');
    if (typeof obj.autonomy.level !== 'number') errors.push('autonomy.level must be integer');
    if (typeof obj.data_handling.stores_personal_data !== 'boolean') errors.push('stores_personal_data must be boolean');
    if (!obj.stopping_authority.stoppable_by || obj.stopping_authority.stoppable_by.length === 0) errors.push('stoppable_by missing');
    if (!obj.stopping_authority.mechanism) errors.push('stopping mechanism missing');
    if (!obj.audit_surface.logging) errors.push('audit logging missing');
    if (!obj.audit_surface.reconstructability) errors.push('reconstructability missing');
    if (!obj.contact.email) errors.push('contact email missing');

    if (errors.length > 0) {
      addRow('ambassador', 'Manifest validation failed: ' + errors.join(', ') + '. Please restart and try again.');
      return;
    }

    var jsonStr = JSON.stringify(obj, null, 2);

    addRow('ambassador', 'Manifest generated. All 13 v1.0 fields declared.');

    setTimeout(function () {
      var d = document.createElement('div');
      d.className = 'msg';
      d.innerHTML =
        '<div style="margin-left:92px">' +
          '<div class="manifest-box">' +
            '<div class="manifest-box-header">manifest ready &middot; agent-manifest-spec.org/v1</div>' +
            '<div class="json-block">' + highlight(jsonStr) + '</div>' +
            '<div class="actions">' +
              '<button class="btn btn-primary" id="copyBtn">Copy JSON</button>' +
              '<button class="btn btn-secondary" id="dlBtn">Download .json</button>' +
              '<button class="btn btn-secondary" id="submitBtn">Submit to The Diplomat</button>' +
              '<span class="copy-ok" id="copyOk">Copied!</span>' +
            '</div>' +
          '</div>' +
          '<div class="next-steps">' +
            '<div class="next-steps-label">Next steps</div>' +
            '<div>&#8594; Validate at <span class="chip">agent-manifest-spec.org/validate</span></div>' +
            '<div>&#8594; Submit to <span class="chip">The Diplomat</span> to register your agent</div>' +
            '<div>&#8594; Cite: <span style="color:var(--text-faint);font-size:11px">DOI 10.5281/zenodo.18833956</span></div>' +
          '</div>' +
          '<div class="restart"><a href="#" onclick="restartSession(); return false;">Generate another manifest &#8594;</a></div>' +
        '</div>';

      chat.appendChild(d);
      scroll();

      document.getElementById('copyBtn').addEventListener('click', function () {
        var fb = document.getElementById('copyOk');

        function doCopy() {
          fb.classList.add('show');
          setTimeout(function () {
            fb.classList.remove('show');
          }, 2000);
        }

        function fallback() {
          var ta = document.createElement('textarea');
          ta.value = jsonStr;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          doCopy();
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(jsonStr).then(doCopy).catch(fallback);
        } else {
          fallback();
        }
      });

      document.getElementById('dlBtn').addEventListener('click', function () {
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = manifest.agent_name.replace(/\s+/g, '-').toLowerCase() + '-manifest.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      document.getElementById('submitBtn').addEventListener('click', function () {
        var btn = document.getElementById('submitBtn');

        // Pre-submit validation
        var preErrors = [];
        if (!obj.agent_name) preErrors.push('agent_name missing');
        if (!obj.agent_version) preErrors.push('agent_version missing');
        if (!obj.owner || !obj.owner.type || !obj.owner.identifier) preErrors.push('owner incomplete');
        if (!obj.purpose || !obj.purpose.primary_code || !obj.purpose.description) preErrors.push('purpose incomplete');
        if (!obj.forbidden_actions || obj.forbidden_actions.length === 0) preErrors.push('forbidden_actions empty');
        if (typeof obj.autonomy.level !== 'number') preErrors.push('autonomy.level not integer');
        if (typeof obj.data_handling.stores_personal_data !== 'boolean') preErrors.push('stores_personal_data not boolean');
        if (!obj.contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.contact.email)) preErrors.push('contact.email invalid');

        if (preErrors.length > 0) {
          btn.textContent = 'Validation error: ' + preErrors[0];
          btn.disabled = true;
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Submitting...';

        fetch('https://agent-manifest-diplomat.vercel.app/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(obj)
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.status === 'accepted') {
              btn.textContent = 'Registered';
              btn.style.background = 'var(--accent)';
              btn.style.color = '#fff';
            } else {
              btn.textContent = 'Error: ' + (data.errors ? data.errors[0] : (data.message || 'rejected'));
              btn.disabled = false;
            }
          })
          .catch(function () {
            btn.textContent = 'Connection error';
            btn.disabled = false;
          });
      });

    }, 400);
  }, 1000);
}

function restartSession() {
  step = 0;
  manifest = {};
  busy = false;
  chat.innerHTML = '';
  inputField.value = '';
  inputField.style.height = 'auto';
  init();
}

function init() {
  lock();

  addRow('system', 'Initializing Agent Manifest Ambassador v0.2');
  addRow('system', 'Protocol: declaration-first · Schema: agent-manifest-spec.org/spec/v1.0', 'system', 400);

  setTimeout(function () {
    addStepBar('session ready', -1);
    addRow('ambassador', 'Hello.', 'system', 100);
    addRow('ambassador', 'I\'m the <span class="chip">Ambassador</span> – a generator for Agent Manifest declarations.', 'system', 600);
    addRow('ambassador', 'An Agent Manifest is a structured JSON declaration describing an agent\'s identity, purpose, constraints, autonomy, risk, and accountability.', 'system', 1200);
    addRow('ambassador', 'I\'ll guide you through six declaration steps. At the end, you\'ll have a valid v1.0 manifest.', 'system', 1900);

    setTimeout(function () {
      addStepBar('step 1 / 6 -- identity', 0);
      addRow('ambassador', 'What is your agent called?').then(function () {
        inputLabel.textContent = 'Agent name';
        inputField.placeholder = 'e.g. the-diplomat, search-agent, manifest-validator...';
        unlock();
      });
    }, 2700);
  }, 800);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'');
}

init();
