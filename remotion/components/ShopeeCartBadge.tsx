import React from "react";
import { CartCTA } from "../paper/CartCTA";

interface ShopeeCartBadgeProps {
  productName?: string;
  price?: string;
  primaryColor?: string;
}

export const ShopeeCartBadge: React.FC<ShopeeCartBadgeProps> = ({
  productName,
  price,
}) => {
  return <CartCTA productName={productName} price={price} />;
};
