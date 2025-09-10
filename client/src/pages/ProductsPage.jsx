import { useContext, useEffect, useState } from "react";
import { ScraperContext } from "../context/ScraperContext";

const ProductsPage = () => {
  const { products, fetchProducts, isLoading, totalPages, error } =
    useContext(ScraperContext);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchProducts(page, 9);
  }, [page]);

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.includes("₹") ? price : `₹${price}`;
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
                key={product.asin}
                className="border rounded-lg shadow-sm p-4 flex flex-col hover:shadow-md transition-shadow bg-white"
              >
                {/* Image */}
                {product.imageUrl && (
                  <div className="w-full h-48 mb-3 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.target.src = "/placeholder-image.png";
                        e.target.alt = "Image not available";
                      }}
                    />
                  </div>
                )}

                {/* Title */}
                <h3 className="mb-2">
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    title={product.title}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.title}
                  </a>
                </h3>

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
                    {product.originalPrice && (
                      <span className="line-through ml-2 text-gray-500 text-sm">
                        {formatPrice(product.originalPrice)}
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
                      <span className="ml-1">{product.reviewCount || "0"}</span>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {product.deliveryInfo && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Delivery:</span>{" "}
                      {product.deliveryInfo}
                    </p>
                  )}

                  {/* Best Seller */}
                  {product.bestSeller === "true" && (
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
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="text-gray-600">
              Page {page} {totalPages ? `of ${totalPages}` : ""}
            </span>

            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={(totalPages ? page >= totalPages : false) || isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No products found.</p>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
