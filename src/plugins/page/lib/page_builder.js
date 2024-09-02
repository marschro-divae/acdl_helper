import update_path from "./update_path"
import repo_path_to_pageId from "./repo_path_to_pageId"
import repo_path_to_tenant from "./repo_path_to_tenant"
import repo_path_to_pagename from "./repo_path_to_pagename"
import template_path_to_pagetype from "./template_path_to_pagetype"
import campaign_parameter_to_cid from "./campaign_parameter_to_cid"

export default function page_builder(event, context) {
  const path = event?.message?.eventInfo?.path || event?.eventInfo?.path

  context.acdl.push(function (dl) {
    const pn = pname(context.config.prefix)
    const page = dl.getState(path)
    const tags = page["xdm:tags"]
    const joined_tags = tags !== null && Array.isArray(tags) && tags.length > 0 ? tags.join(";") : ""
    const update_object = update_path(path, {
      [pn("pageId")]: repo_path_to_pageId(page["repo:path"]),
      [pn("tenant")]: repo_path_to_tenant(page["repo:path"]),
      [pn("pagename")]: repo_path_to_pagename(page["repo:path"]),
      [pn("pagetype")]: template_path_to_pagetype(page["xdm:template"]),
      [pn("cid")]: campaign_parameter_to_cid(context.config.cid_mapping, document.location.search),
      [pn("pagetags")]: joined_tags,
      [pn("ownPath")]: path,
      [pn("ownId")]: path.split(".")[path.split(".").length - 1],
    })

    context.acdl.push(update_object)
  })

  return path
}

function pname(prefix) {
  return function (field) {
    return `${prefix}:${field}`
  }
}
