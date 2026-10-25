import { Suspense } from "react";
import { InventoryDetailsView } from "@/src/features/catalog/inventory/views/inventory-details-view";

/** The Suspense boundary is required: the view reads useSearchParams(). */
export default function InventoryDetailsPage() {
    return (
        <Suspense>
            <InventoryDetailsView />
        </Suspense>
    );
}
