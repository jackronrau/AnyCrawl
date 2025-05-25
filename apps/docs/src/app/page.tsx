import { redirect } from "next/navigation";

export default function RootPage() {
    // 重定向到默认语言的首页
    redirect("/en/general");
}
