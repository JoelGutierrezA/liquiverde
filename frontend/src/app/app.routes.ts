import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/products/product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
  },
  {
    path: 'optimizer',
    loadComponent: () =>
      import('./features/optimizer/optimizer.component').then((m) => m.OptimizerComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
