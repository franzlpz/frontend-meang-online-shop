import { IMeData } from '@core/interfaces/session.interface';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { StripePaymentService } from '@mugan86/stripe-payment-form';
import { take } from 'rxjs/internal/operators/take';
import { CartService } from '@shop/core/services/cart.service.ts.service';
import { CURRENCY_SELECT, CURRENCY_CODE } from '@core/constants/config';
import { infoEventAlert, loadData } from '@shared/alerts/alerts';
import { CustomerService } from '@shop/core/services/stripe/customer.service';
import { TYPE_ALERT } from '@shared/alerts/values.config';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  meData: IMeData;
  key = environment.stripePublicKey;
  address = '';
  constructor(private auth: AuthService, private router: Router,
              private stripePayment: StripePaymentService,
              private cartService: CartService,
              private customerService: CustomerService) {
    this.auth.accessVar$.subscribe((data: IMeData) => {
      if (!data.status) {
        // Ir a login
        this.router.navigate(['/login']);
        return;
      }
      this.meData = data;
    });

    this.stripePayment.cardTokenVar$.pipe(take(1)).subscribe((token: string) => {
      if (token.indexOf('tok_') > -1 && this.meData.status && this.address !== '') {
        // Podemos enviar los datos
        console.log('Podemos enviar la info correctamente: ', token);
        // Divisa
        console.log('Símbolo', CURRENCY_SELECT, 'Código: ', CURRENCY_CODE);
        // Client de stripe
        console.log(this.meData.user.stripeCustomer);
        // Total a pagar
        console.log('Total pagar: ', this.cartService.cart.total);
        // Descripción del pedido (tenemos que crear función en el carrito)
        console.log(this.cartService.orderDescription());
      }
    });
  }

  ngOnInit(): void {
    this.auth.start();
    if ( localStorage.getItem('address')) {
      this.address = localStorage.getItem('address');
      localStorage.removeItem('address');
    }
    this.cartService.initialize();
    localStorage.removeItem('route_after_login');
  }

  async sendData() {
    if (this.meData.user.stripeCustomer === null) {
      // Alerta para mostrar info
      await infoEventAlert('Cliente no existe', 'Necesitamos un cliente para realizar el pago');
      const stripeName = `${this.meData.user.name} ${this.meData.user.lastname}`;
      loadData('Procesando la información', 'Creando el cliente...');
      this.customerService.add(
        stripeName,
        this.meData.user.email
      ).pipe(take(1)).subscribe(async (result: { status: boolean, message: string}) => {
        if (result.status) {
          await infoEventAlert('Cliente añadido al usuario', 'Reiniciar la sesión', TYPE_ALERT.SUCCESS);
          localStorage.setItem('address', this.address);
          localStorage.setItem('route_after_login', this.router.url);
          this.auth.resetSession();
        } else {
          await infoEventAlert('Cliente no añadido', result.message, TYPE_ALERT.WARNING);
        }
      });
      return;
    }
    this.stripePayment.takeCardToken(true);
  }

}
