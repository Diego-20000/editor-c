#include <stdio.h>
#include <math.h>
float DISTANCIA(float X1, float Y1, float X2, float Y2);
int main(void) {
    float X1, Y1, X2, Y2;
    scanf("%f%f%f%f", &X1, &Y1, &X2, &Y2);
    printf("Distancia: %.2f\n", DISTANCIA(X1, Y1, X2, Y2));
    return 0;
}
float DISTANCIA(float X1, float Y1, float X2, float Y2) {
    double DX = X2 - X1, DY = Y2 - Y1;
    return (float)sqrt(DX * DX + DY * DY);
}
