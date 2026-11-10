#include <stdio.h>

int main(void) {
    int A, B;
    char OPERACION;
    float RESULTADO;

    scanf("%d", &A);
    scanf("%d", &B);
    scanf(" %c", &OPERACION);

    switch (OPERACION) {
        case '+':
            RESULTADO = A + B;
            printf("Resultado: %5.2f\n", RESULTADO);
            break;
        case '-':
            RESULTADO = A - B;
            printf("Resultado: %5.2f\n", RESULTADO);
            break;
        case '*':
            RESULTADO = A * B;
            printf("Resultado: %5.2f\n", RESULTADO);
            break;
        case '/':
            if (B == 0) {
                printf("No se puede dividir por cero\n");
            } else {
                RESULTADO = (float)A / B;
                printf("Resultado: %5.2f\n", RESULTADO);
            }
            break;
        default:
            printf("Operacion desconocida\n");
    }

    return 0;
}
