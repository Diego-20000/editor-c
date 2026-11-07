#include <stdio.h>
int main()
{
    float r = prom(3, 4);
    printf("%f\n", r);
    return 0;
}
float prom(int a, int b) { return (a + b) / 2.0; }
