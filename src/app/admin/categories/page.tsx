import type { Metadata } from "next";
import { getAdminTaxonomy } from "@/lib/admin/queries";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const metadata: Metadata = { title: "Categories", robots: { index: false, follow: false } };

/** Categories admin (Task 3). Two taxonomies — categories and age tiers —
 *  share one `TaxonomyManager` via the `kind` prop, switched by tab. */
export default async function Page() {
  const [categories, ageTiers] = await Promise.all([
    getAdminTaxonomy("category"),
    getAdminTaxonomy("ageTier"),
  ]);
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Categories</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage product categories and age tiers.</p>
      <Tabs defaultValue="category" className="mt-6">
        <TabsList>
          <TabsTrigger value="category">Categories</TabsTrigger>
          <TabsTrigger value="ageTier">Age tiers</TabsTrigger>
        </TabsList>
        <TabsContent value="category" className="mt-4">
          <TaxonomyManager kind="category" items={categories} />
        </TabsContent>
        <TabsContent value="ageTier" className="mt-4">
          <TaxonomyManager kind="ageTier" items={ageTiers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
