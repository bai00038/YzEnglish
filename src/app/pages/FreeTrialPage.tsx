import { Sparkles } from "lucide-react";
import { FreeExperienceCard } from "@/app/components/FreeExperienceCard";
import { LoadingState, ErrorState, EmptyState } from "@/app/components/DataState";
import { useFreeTrialScenes } from "@/data/collections-access";

export function FreeTrialPage() {
  const { data, loading, error } = useFreeTrialScenes();
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-9 md:px-8 md:py-11">
      <div className="mb-7 max-w-[720px]">
        <p className="editorial-kicker mb-2.5 flex items-center gap-2"><Sparkles size={15} /> Free experience · 免费体验</p>
        <h1 className="display-serif text-[30px] font-semibold leading-tight text-primary md:text-[38px]">先体验几个真实场景，<br /><em className="font-normal">再决定从哪里开始。</em></h1>
        <p className="mt-3.5 text-[15px] leading-relaxed text-muted-foreground">下面三个场景来自不同正式合集；已上线的场景可以完整学习，制作中的会标明状态。每张卡片也会标出它收录在哪个合集里。</p>
      </div>
      {loading ? <LoadingState label="Loading free scenes…" /> : error ? <ErrorState message={error} /> : data?.length ? (
        <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
          {data.map(({ scene, collectionLabel }) => <FreeExperienceCard key={scene.externalId ?? scene.id} scene={scene} collectionLabel={collectionLabel} />)}
        </div>
      ) : <EmptyState title="免费体验课程即将上线。" />}
    </div>
  );
}
