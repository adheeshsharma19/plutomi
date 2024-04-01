import { Outlet, json, useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return json({
    podName: process.env.POD_NAME
  });
};

export default function DocsRoot() {
  const { podName }: { podName: string } = useLoaderData();

  return (
    <div className="w-full h-full">
      <p className="text-sm text-slate-400  absolute left-0">{podName}</p>
      <h1>Docs Root</h1>
      <Outlet />
    </div>
  );
}
