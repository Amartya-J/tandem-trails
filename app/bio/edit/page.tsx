import { requireChatGPTUser } from "@/app/chatgpt-auth";
import BioEditor from "./BioEditor";

export const dynamic = "force-dynamic";

export default async function BioEditPage() {
  const user = await requireChatGPTUser("/bio/edit");
  return <BioEditor displayName={user.displayName} />;
}
