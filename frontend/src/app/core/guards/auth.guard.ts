import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Equivalente a PrivateRoute.jsx: exige sesion activa y, opcionalmente, un rol permitido
// declarado en la ruta como data: { roles: ['Medico'] }
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (!user) {
    // [Landing] Recuerda a donde queria ir para volver despues de iniciar sesion
    router.navigate(['/login'], { queryParams: { volver: state.url } });
    return false;
  }

  const rolesPermitidos = route.data?.['roles'] as string[] | undefined;
  if (rolesPermitidos && !rolesPermitidos.includes(user.rol)) {
    router.navigateByUrl(auth.homeParaRol(user.rol));
    return false;
  }

  return true;
};
