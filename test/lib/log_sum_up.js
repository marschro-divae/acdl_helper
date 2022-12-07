export default function log_sum_up(result, log_all) {
  const sum_up_result = {
    name: "",
    tests: 0,
    succeeded: 0,
    failed: 0,
  };
  const sum_up = result.reduce(function (acc, item) {
    acc.name = item.name;
    acc.tests += 1;
    acc.succeeded = item.result === "SUCCEED" ? acc.succeeded + 1 : acc.succeeded;
    acc.failed = item.result === "FAILED" ? acc.failed + 1 : acc.failed;
    return acc;
  }, sum_up_result);
  if (sum_up.failed > 0) sum_up.details = result;
  if (log_all) sum_up.details = result;
  console.log(sum_up);
}
