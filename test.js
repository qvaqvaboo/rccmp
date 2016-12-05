var CMP = require('./index');

var cmp = new CMP({host: 'https://stage-cmp2.ringcentral.com', user: 'vadim.efimov', pass: 'Kents46!', rejectUnauthorized: false});
var cmr = {
  "summary": "8.4 in-place upgrade: sjc01-p09 part1",
  "external-title": "8.4 in-place upgrade",
  "projects[]": [
    1780
  ],
  "customer-facing": 0,
  "no-risk": 1,
  "jira-req-id": "Roadmap event #28964",
  "description": "Roll-out of <a href=\"https://roadmap.ringcentral.com/projects/1780\">8.4 in-place upgrade</a> project according to Release Notes: https://wiki.ringcentral.com/display/RLZ/Release+8.4+-+In-place+upgrade",
  "qa-results": "see RN",
  "internal-resources-users-id": "alexander.bulanov, konstantin.filippov",
  "external-description": "Roll-out of 8.4 in-place upgrade project",
  "owner-id": "denis.denisenko",
  "sponsor-id": "denis.shevchenko",
  "executor-id": "denis.denisenko",
  "environment_id": 1,
  "requesttype_id": 2,
  "department_id": 14,
  "preapprovedchange_id": 187,
  "expected-start-date": "2016-11-28T23:00:00-08:00",
  "expected-end-date": "2016-11-29T03:00:00-08:00",
  "wiki-id": "204982157",
  "hostgroups": [
    {
      "target-value": "sjc01-p09-(CDB|ADB01|ADT|AWS|BIL|FAX|JWS|PAS|PCF|SCS|TAS|TEA)",
      "configurationitem-id": 37,
      "name": "sjc01-p09",
      "unit-state-id": 3,
      "auto-zabbix": 1
    }
  ],
  "id": 28964,
  "external-resources": ""
}

var request = cmp.generateCMR(cmr)

request.progress( (msg) => {console.log(msg)});

request.catch( (err) => {console.log(err)});
