import { useContext, useEffect, useState } from "react";
import { ScraperContext } from "../context/ScraperContext";

const ProductsPage = () => {
  const { products, fetchProducts, isLoading, totalPages, error } =
    useContext(ScraperContext);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchProducts(page, 20); // fetch 20 products per page
  }, [page]);

  // Helper function to format price
  const formatPrice = (price) => {
    if (!price) return "N/A";
    // If price already has ₹ symbol, return as is, otherwise add it
    return price.includes("₹") ? price : `₹${price}`;
  };

  // Helper function to format numbers (remove commas for proper display)
  const formatNumber = (num) => {
    if (!num) return "0";
    return num.toString();
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">All Products</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading products: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Products</h1>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-lg">Loading products...</div>
        </div>
      ) : Array.isArray(products) && products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.asin || product._id}
                className="border rounded-lg shadow-sm p-4 flex flex-col hover:shadow-md transition-shadow duration-200 bg-white"
              >
                {/* Image */}
                {product.image_url && (
                  <div className="w-full h-40 mb-3 flex items-center justify-center bg-gray-50 rounded">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTE2IDlIMTJNOCAxM0g4LjAxTTggMTdIOC4wMU04IDlIOC4wMSIgc3Ryb2tlPSIjOUI5QkE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K";
                        e.target.alt = "Image not available";
                      }}
                    />
                  </div>
                )}

                {/* Title (clickable) */}
                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-blue-600 hover:underline mb-2 block"
                  title={product.title} // tooltip shows full title
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {product.title}
                </a>

                <div className="flex-grow">
                  {/* ASIN */}
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">ASIN:</span> {product.asin}
                  </p>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="text-lg font-bold text-green-600">
                      {formatPrice(product.price)}
                    </span>
                    {product.original_price && (
                      <span className="line-through ml-2 text-gray-500 text-sm">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </div>

                  {/* Rating & Reviews */}
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <div className="flex items-center">
                      <span className="font-medium">Rating:</span>
                      <span className="ml-1">{product.rating || "N/A"}</span>
                      {product.rating && (
                        <span className="ml-1 text-yellow-500">⭐</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Reviews:</span>
                      <span className="ml-1">
                        {product.review_count || "0"}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {product.delivery_info && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Delivery:</span>{" "}
                      {product.delivery_info}
                    </p>
                  )}

                  {/* Best Seller Badge */}
                  {product.best_seller === "YES" && (
                    <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      🌟 Best Seller
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1 || isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-gray-600">
                Page {page} {totalPages ? `of ${totalPages}` : ""}
              </span>
            </div>

            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={(totalPages ? page >= totalPages : false) || isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No products found.</p>
          {page > 1 && (
            <button
              onClick={() => setPage(1)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to first page
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
