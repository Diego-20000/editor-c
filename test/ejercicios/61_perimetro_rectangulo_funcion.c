#include <stdio.h>
float PERIMETRO(float B, float H);
int main(void) {
    float B, H;
    scanf("%f%f", &B, &H);
    printf("Perimetro: %.2f\n", PERIMETRO(B, H));
    return 0;
}
float PERIMETRO(float B, float H) { return 2.0f * (B + H); }
