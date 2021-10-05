import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const CART = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const updateCart = (products: Product[]) => {
    localStorage.setItem(CART, JSON.stringify(products));
    setCart(products);
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const { data: product } = await api.get<Product>(`products/${productId}`);

      const productAdding = cart.find((p) => p.id === productId) || { ...product, amount: 0 };

      if (stock.amount > productAdding.amount) {
        let found = false;
        const newCart = cart.map((p) => {
          if (p.id === productAdding.id) {
            found = true;
            return { ...p, amount: p.amount + 1 };
          }
          return p;
        });
        if (!found) newCart.push({ ...productAdding, amount: productAdding.amount + 1 });
        updateCart(newCart);
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const found = cart.find((p) => p.id === productId);
      if (found) {
        updateCart(cart.filter((product) => product.id !== productId));
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get(`stock/${productId}`);
      const productFound = cart.find((p) => p.id === productId);
      if (!productFound) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }
      if (amount <= 0) return;
      if (stock.amount >= amount) {
        const newCart = cart.map((p) => {
          return p.id === productId ? { ...p, amount: amount } : p;
        });
        updateCart(newCart);
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
