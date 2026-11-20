#include <stdio.h>

int main() {
    int i;
    int N;
    int NUMERO;
    int MAYOR;
    int MENOR;

    N = 0;
    NUMERO = 0;
    MAYOR = 0;
    MENOR = 0;

    printf("Cantidad de valores (1 a 10): ");
    scanf("%d", &N);

    if (N < 1 || N > 10) {
        printf("La cantidad no es valida.\n");
    } else {
        for (i = 1; i <= N; i++) {
            printf("Valor %d: ", i);
            scanf("%d", &NUMERO);
            if (i == 1) {
                MAYOR = NUMERO;
                MENOR = NUMERO;
            } else {
                if (NUMERO > MAYOR) {
                    MAYOR = NUMERO;
                }
                if (NUMERO < MENOR) {
                    MENOR = NUMERO;
                }
            }
        }
        printf("Mayor: %d\n", MAYOR);
        printf("Menor: %d\n", MENOR);
    }
}
