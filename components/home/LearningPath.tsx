import { Award, Droplets, ShoppingCart } from "lucide-react";

const STEPS = [
  {
    icon: Droplets,
    title: "领取 YD",
    description: "通过 Faucet 领取测试网 YD 代币。",
  },
  {
    icon: ShoppingCart,
    title: "购买课程",
    description: "使用 YD 代币解锁优质区块链课程内容。",
  },
  {
    icon: Award,
    title: "获得 NFT 证书",
    description: "完成课程后铸造可验证的 ERC-721 证书。",
  },
];

export function LearningPath() {
  return (
    <section className="container-app py-stack-lg">
      <h2 className="text-center font-heading text-headline-lg text-on-surface">学习路径</h2>
      <div className="mt-stack-md flex flex-col gap-stack-md sm:flex-row sm:gap-stack-sm">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-outline-variant bg-surface-container p-6 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary-container">
                <Icon className="size-6 text-on-primary-container" aria-hidden="true" />
              </div>
              <span className="font-mono text-label-md text-on-surface-variant">
                Step {index + 1}
              </span>
              <h3 className="font-heading text-headline-md text-on-surface">{step.title}</h3>
              <p className="text-body-md text-on-surface-variant">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
