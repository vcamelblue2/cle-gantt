
import { Router } from "../libs/cle/routing/lite_routing.js"

export const RoutingButtonLink = (text="Open Home", urlParams = $=>["home", undefined])=>{
    return { button: {
        text: text, 
        h_onclick: $=>Router.navigate(...urlParams($), false), 
        a_style: "width: 100%; background: none; border: 0.25px dashed #dddddd; margin-top: 10px; padding: 10px;color: #dddddd; cursor: pointer;"
    }}
}

