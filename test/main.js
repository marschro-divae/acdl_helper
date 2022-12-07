import log_sum_up from "./lib/log_sum_up.js";
import * as test_dataLayer_object from "./test_dataLayer_object.test.js";
import * as repo_path_to_pageId from "./repo_path_to_pageId.test.js";
import * as repo_path_to_tenant from "./repo_path_to_tenant.test.js";
import * as campaign_parameter_to_cid from "./campaign_parameter_to_cid.test.js";
import * as get_component_data from "./get_component_data.test.js";

log_sum_up(test_dataLayer_object.run());
log_sum_up(repo_path_to_pageId.run());
log_sum_up(campaign_parameter_to_cid.run());
log_sum_up(get_component_data.run());
log_sum_up(repo_path_to_tenant.run());
