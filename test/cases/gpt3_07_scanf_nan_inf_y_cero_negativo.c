#include <stdio.h>
#include <math.h>

int main()
{
    double CERO = 1.0;
    double NAN_VALOR = 0.0;
    double INF_VALOR = 0.0;
    int R;

    R = scanf("%lf %lf %lf",
              &CERO, &NAN_VALOR, &INF_VALOR);

    printf("R=%d\n", R);
    printf("CERO=%g SIGNO=%d\n",
           CERO, !!signbit(CERO));
    printf("NAN=%d\n", !!isnan(NAN_VALOR));
    printf("INF=%d\n", !!isinf(INF_VALOR));
}
