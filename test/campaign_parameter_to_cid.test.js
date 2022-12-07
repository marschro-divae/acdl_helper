import simple_functional_test from "./lib/simple_functional_test.js";
import fn from "../lib/campaign_parameter_to_cid.js";

const tests = [
  {
    args: ["?foo=bar"],
    assert: "",
  },
  {
    args: [""],
    assert: "",
  },
  {
    args: ["?"],
    assert: "",
  },
  {
    args: ["?utm_medium=text"],
    assert: ":text::::",
  },
  {
    args: ["?utm_source=newsletter"],
    assert: "newsletter:::::",
  },
  {
    args: ["?utm_source=newsletter&utm_medium=text&utm_campaign=My%small%campaign&utm_content=MKU"],
    assert: "newsletter:text:My%small%campaign::MKU:",
  },
  {
    args: ["?utm_source=newsletter&utm_medium=&utm_campaign=My%small%campaign&utm_content=MKU"],
    assert: "newsletter::My%small%campaign::MKU:",
  },
  {
    args: ["?utm_source=newsletter&utm_campaign=My%small%campaign&utm_content=MKU"],
    assert: "newsletter::My%small%campaign::MKU:",
  },
  {
    args: ["?utm_source=newsletter&utm_medium=text&utm_campaign=My%small%campaign&utm_content="],
    assert: "newsletter:text:My%small%campaign:::",
  },
  {
    args: ["?utm_source=newsletter&utm_medium=text&utm_campaign=My%small%campaign&utm_content=MKU"],
    assert: "newsletter:text:My%small%campaign::MKU:",
  },
  {
    args: ["?utm_source=intranet&utm_medium=button&utm_campaign=FamilientagDigital2020&utm_term=VB"],
    assert: "intranet:button:FamilientagDigital2020:VB::",
  },
  {
    args: ["?utm_source=intranet&utm_medium=button&utm_campaign=FamilientagDigital2020&utm_term=Innendienst"],
    assert: "intranet:button:FamilientagDigital2020:Innendienst::",
  },
  {
    args: ["?utm_source=intranet&utm_medium=button&utm_campaign=FamilientagDigital2020&utm_term=VB"],
    assert: "intranet:button:FamilientagDigital2020:VB::",
  },
  {
    args: ["?utm_source=mail&utm_medium=text&utm_campaign=FamilientagDigital2020&utm_term=VB"],
    assert: "mail:text:FamilientagDigital2020:VB::",
  },
  {
    args: ["?utm_source=mail&utm_medium=text&utm_campaign=FamilientagDigital2020&utm_term=Innendienst"],
    assert: "mail:text:FamilientagDigital2020:Innendienst::",
  },
  {
    args: ["?utm_source=mail&utm_medium=text&utm_campaign=Familientag_digital_2020&utm_term=VB"],
    assert: "mail:text:Familientag_digital_2020:VB::",
  },
  {
    args: ["?utm_source=mail&utm_medium=text&utm_campaign=Familientag_digital_2020&utm_term=VB&utm_relay=gerade-jetzt"],
    assert: "mail:text:Familientag_digital_2020:VB::gerade-jetzt",
  },
  {
    args: ["?utm_relay=gerade-jetzt&utm_campaign=my-little-pony"],
    assert: "::my-little-pony:::gerade-jetzt",
  },
  {
    args: ["?utm_relay=gerade-jetzt"],
    assert: ":::::gerade-jetzt",
  },
];

export const run = simple_functional_test(fn, tests);
