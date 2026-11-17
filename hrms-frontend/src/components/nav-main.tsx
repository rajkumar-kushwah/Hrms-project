import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store";
import { iconMap } from "@/lib/icon-map";
import { canViewModule } from "@/utilis/roleUtils";

// export function NavMain({
//   items,
// }: {
//   items: {
//     title: string
//     url: string
//     icon?: React.ReactNode
//     isActive?: boolean
//     items?: {
//       title: string
//       url: string
//     }[]
//   }[]
// }) {
//   return (
//     <SidebarGroup>
//       <SidebarGroupLabel>Platform</SidebarGroupLabel>
//       <SidebarMenu>
//         {items.map((item) => (
//           <Collapsible
//             key={item.title}
//             asChild
//             defaultOpen={item.isActive}
//             className="group/collapsible"
//           >
//             <SidebarMenuItem>
//               <CollapsibleTrigger asChild>
//                 <SidebarMenuButton tooltip={item.title}>
//                   {item.icon}
//                   <span>{item.title}</span>
//                   <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
//                 </SidebarMenuButton>
//               </CollapsibleTrigger>
//               <CollapsibleContent>
//                 <SidebarMenuSub>
//                   {item.items?.map((subItem) => (
//                     <SidebarMenuSubItem key={subItem.title}>
//                       <SidebarMenuSubButton asChild>
//                         <Link to={subItem.url}>
//                           <span>{subItem.title}</span>
//                         </Link>
//                       </SidebarMenuSubButton>
//                     </SidebarMenuSubItem>
//                   ))}
//                 </SidebarMenuSub>
//               </CollapsibleContent>
//             </SidebarMenuItem>
//           </Collapsible>
//         ))}
//       </SidebarMenu>
//     </SidebarGroup>
//   )
// }


export function NavMain() {
  const { user } = useAuthStore();
  const location = useLocation();
  const permissions = user?.role?.permissions ?? [];
  // console.log("USER:", user);
  // console.log("PERMISSIONS:", permissions);

  const uniquePermissions = (items: typeof permissions) =>
    Array.from(
      new Map(items.map((p) => [p.module.id, p])).values()
    );

  const visibleModules = uniquePermissions(
    permissions.filter(
      (p) => p.canView && p.module.parentId === null &&
        canViewModule(user, p.module.name)
    )
  ).sort((a, b) => a.module.order - b.module.order);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarMenu>
        {visibleModules.map((p) => {
          const mod = p.module;

          const children = uniquePermissions(
            permissions.filter(
              (cp) => cp.canView && cp.module.parentId === mod.id &&
                canViewModule(user, cp.module.name)
            )
          ).sort((a, b) => a.module.order - b.module.order);

          // Active check - currect route match kro
          const isParenttActive =
            location.pathname === mod.url ||
            children.some((cp) => location.pathname === cp.module.url);

          // NavMain mein temporarily add karo
          return (
            <Collapsible
              key={mod.id}
              asChild
              defaultOpen={isParenttActive}  // Active hone per open rahe
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={mod.displayName} isActive={isParenttActive} {...(children.length === 0 && { asChild: true })} className={`
            !transition-none
    ${isParenttActive
                      ? "!bg-[var(--logo-green)] !text-[#000]"
                      : "text-sidebar-foreground hover:!bg-[var(--logo-green)] hover:!text-[#000]"
                    }
  `}>
                    {children.length === 0 ? (
                      //  Children nahi — directly Link
                      <Link to={mod.url ?? "#"} className="flex items-center gap-2 w-full text-inherit">
                        {iconMap[mod.icon ?? ""]}
                        <span>{mod.displayName}</span>
                      </Link>
                    ) : (
                      //  Children hain — Collapsible trigger
                      <>
                        {iconMap[mod.icon ?? ""]}
                        <span>{mod.displayName}</span>
                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {children.length > 0 && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {children.map((cp) => {
                        const isSubActive = location.pathname === cp.module.url

                        return (
                          <SidebarMenuSubItem key={cp.module.id}>
                            <SidebarMenuSubButton asChild isActive={isSubActive} className={`
                                  !transition-none
                                  ${isSubActive
                                ? "!bg-[var(--logo-green)] !text-[#000]"
                                : "text-sidebar-foreground hover:!bg-[var(--logo-green)] hover:!text-[#000]"
                              }
                            `}>
                              <Link to={cp.module.url ?? "#"} className="text-inherit">
                                <span>{cp.module.displayName}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}