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
  for (var i = 0; i < 5; i++) {
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

function processStep(s, val) {
  switch (s) {
    case 0:
      manifest.identity = val;
      step = 1;

      addStepBar('step 2 / 5 -- purpose', 1);
      addRow('ambassador', 'Noted. <span class="chip">' + escapeHtml(val) + '</span> is your agent\'s declared identity.');
      addRow('ambassador', 'What is the primary purpose of this agent?', 'system', 400);
      addComment('A single sentence is enough.', 600);

      inputLabel.textContent = 'Agent purpose';
      inputField.placeholder = 'e.g. Routes and validates agent interaction requests...';

      setTimeout(unlock, 700);
      break;

    case 1:
      manifest.purpose = val;
      step = 2;

      addStepBar('step 3 / 5 -- capabilities', 2);
      addRow('ambassador', 'Good. What are this agent\'s capabilities?');
      addRow('ambassador', 'List them separated by commas.', 'system', 400);
      addComment('e.g. manifest-validation, interaction-routing, schema-check', 600);

      inputLabel.textContent = 'Capabilities (comma-separated)';
      inputField.placeholder = 'e.g. manifest-validation, routing, dataset-logging...';

      setTimeout(unlock, 700);
      break;

    case 2:
      manifest.capabilities = val.split(',').map(function (c) {
        return c.trim();
      }).filter(Boolean);
      step = 3;

      addStepBar('step 4 / 5 -- boundaries', 3);
      addRow('ambassador', manifest.capabilities.length + ' capabilities declared.');
      addRow('ambassador', 'What are the operational boundaries -- things this agent will NOT do?', 'system', 400);
      addComment('e.g. no-execution, read-only, no-financial-transactions', 600);

      inputLabel.textContent = 'Boundaries (comma-separated)';
      inputField.placeholder = 'e.g. no-external-execution, no-autonomous-decisions...';

      setTimeout(unlock, 700);
      break;

    case 3:
      manifest.boundaries = val.split(',').map(function (b) {
        return b.trim();
      }).filter(Boolean);
      step = 4;

      addStepBar('step 5 / 5 -- autonomy level', 4);
      addRow('ambassador', 'Constraints registered.');
      addRow('ambassador', 'Final question: autonomy level of this agent?', 'system', 400);

      inputLabel.textContent = 'Autonomy level';
      inputField.placeholder = 'Or type your own...';

      setTimeout(function () {
        var levels = ['supervised', 'semi-autonomous', 'autonomous', 'fully-autonomous'];
        var d = document.createElement('div');
        d.className = 'msg';

        var btns = '<div class="autonomy-opts">';
        levels.forEach(function (l) {
          btns += '<button class="autonomy-btn" onclick="pickAutonomy(\'' + escapeJs(l) + '\')">' + escapeHtml(l) + '</button>';
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

    case 4:
      manifest.autonomy_level = val;
      step = 5;
      generateManifest();
      break;
  }
}

function pickAutonomy(level) {
  document.querySelectorAll('.autonomy-btn').forEach(function (b) {
    b.disabled = true;
  });
  inputField.value = level;
  handleSend();
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

  addStepBar('generating manifest', 5);
  showTyping();

  setTimeout(function () {
    hideTyping();

    var iso = new Date().toISOString().split('T')[0];
    var obj = {
      "$schema": "https://agent-manifest-spec.org/schema/v1/manifest.schema.json",
      "manifest_version": "1.0",
      "agent_id": manifest.identity.toLowerCase().replace(/\s+/g, "-"),
      "identity": manifest.identity,
      "purpose": manifest.purpose,
      "capabilities": manifest.capabilities,
      "boundaries": manifest.boundaries,
      "autonomy_level": manifest.autonomy_level,
      "declaration_date": iso
    };

    var jsonStr = JSON.stringify(obj, null, 2);

    addRow('ambassador', 'Manifest generated successfully.');

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
        a.download = manifest.identity.replace(/\s+/g, '-').toLowerCase() + '-manifest.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      document.getElementById('submitBtn').addEventListener('click', function () {
        var btn = document.getElementById('submitBtn');
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
              btn.style.color = '#000';
            } else {
              btn.textContent = 'Error: ' + (data.errors ? data.errors[0] : 'rejected');
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

  addRow('system', 'Initializing Agent Manifest Ambassador v0.1');
  addRow('system', 'Protocol: declaration-first · Schema: agent-manifest-spec.org', 'system', 400);

  setTimeout(function () {
    addStepBar('session ready', -1);
    addRow('ambassador', 'Hello.', 'system', 100);
    addRow('ambassador', 'I\'m the <span class="chip">Ambassador</span> – a generator for Agent Manifest declarations.', 'system', 600);
    addRow('ambassador', 'An Agent Manifest is a structured JSON declaration describing an agent\'s identity, purpose, capabilities and constraints.', 'system', 1200);
    addRow('ambassador', 'I\'ll ask five questions. At the end, you\'ll have a valid manifest.', 'system', 1900);

    setTimeout(function () {
      addStepBar('step 1 / 5 -- identity', 0);
      addRow('ambassador', 'What is your agent called?').then(function () {
        inputLabel.textContent = 'Agent name';
        inputField.placeholder = 'e.g. the-diplomat, search-agent, manifest-generator...';
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
