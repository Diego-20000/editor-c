#include <stdio.h>

int main() {
    double A;
    double B;
    double RESULTADO;
    char OPERADOR;

    A = 0.0;
    B = 0.0;
    RESULTADO = 0.0;
    OPERADOR = '?';

    printf("Primer numero: ");
    scanf("%lf", &A);
    printf("Operador (+, -, *, /): ");
    scanf(" %c", &OPERADOR);
    printf("Segundo numero: ");
    scanf("%lf", &B);

    switch (OPERADOR) {
        case '+':
            RESULTADO = A + B;
            printf("Resultado: %.3f\n", RESULTADO);
            break;
        case '-':
            RESULTADO = A - B;
            printf("Resultado: %.3f\n", RESULTADO);
            break;
        case '*':
            RESULTADO = A * B;
            printf("Resultado: %.3f\n", RESULTADO);
            break;
        case '/':
            if (B != 0.0) {
                RESULTADO = A / B;
                printf("Resultado: %.3f\n", RESULTADO);
            } else {
                printf("No se puede dividir por cero.\n");
            }
            break;
        default:
            printf("El operador no es valido.\n");
    }
}
